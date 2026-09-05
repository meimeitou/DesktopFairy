'use strict';

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { PROCESSOR_TIMEOUT_MS, replaceDocumentImages } = require('./lib.cjs');

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}超时（${Math.round(ms / 1000)}s）`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function readTextFile(filePath) {
  return fs.promises.readFile(filePath, 'utf8');
}

async function readDocx(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.convertToMarkdown(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(() => ({
        src: '',
        alt: '图片',
      })),
    },
  );
  const text = replaceDocumentImages(String(result.value || ''));
  if (!text) throw new Error('docx 未抽出可索引文本');
  return text;
}

function markdownFromZip(zip) {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const mdName = names.find((name) => name.toLowerCase().endsWith('.md'))
    || names.find((name) => name.toLowerCase().includes('full') && name.toLowerCase().endsWith('.md'));
  if (!mdName) throw new Error('处理器结果中没有 Markdown 文件');
  return zip.files[mdName].async('string');
}

async function processMineru({ filePath, fileName, apiHost, apiKey, signal }) {
  if (!apiKey) throw new Error('未配置 MinerU API Key');
  const host = String(apiHost || 'https://mineru.net').replace(/\/+$/, '');
  const dataId = path.basename(filePath);
  const createRes = await fetch(`${host}/api/v4/file-urls/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      files: [{ name: fileName, data_id: dataId }],
      model_version: 'pipeline',
    }),
    signal,
  });
  if (!createRes.ok) {
    throw new Error(`MinerU 申请上传地址失败 HTTP ${createRes.status}: ${(await createRes.text()).slice(0, 200)}`);
  }
  const created = await createRes.json();
  if (created.code !== 0) throw new Error(created.msg || 'MinerU 申请上传失败');
  const batchId = created.data.batch_id;
  const uploadUrl = created.data.file_urls[0];
  const uploadHeaders = created.data.headers?.[0] || {};
  const fileBuf = await fs.promises.readFile(filePath);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: uploadHeaders,
    body: fileBuf,
    signal,
  });
  if (!putRes.ok) {
    throw new Error(`MinerU 上传失败 HTTP ${putRes.status}: ${(await putRes.text()).slice(0, 200)}`);
  }

  const started = Date.now();
  while (Date.now() - started < PROCESSOR_TIMEOUT_MS) {
    if (signal?.aborted) throw new Error('已中断');
    const poll = await fetch(`${host}/api/v4/extract-results/batch/${batchId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (!poll.ok) {
      throw new Error(`MinerU 查询失败 HTTP ${poll.status}: ${(await poll.text()).slice(0, 200)}`);
    }
    const payload = await poll.json();
    if (payload.code !== 0) throw new Error(payload.msg || 'MinerU 查询失败');
    const fileResult = payload.data?.extract_result?.[0];
    if (!fileResult || fileResult.state === 'pending' || fileResult.state === 'running'
      || fileResult.state === 'waiting-file' || fileResult.state === 'converting') {
      await new Promise((r) => setTimeout(r, 2500));
      continue;
    }
    if (fileResult.state === 'failed') {
      throw new Error(fileResult.err_msg || 'MinerU 转换失败');
    }
    if (fileResult.state !== 'done' || !fileResult.full_zip_url) {
      throw new Error('MinerU 完成但没有结果文件');
    }
    const zipRes = await fetch(fileResult.full_zip_url, { signal });
    if (!zipRes.ok) throw new Error(`下载 MinerU 结果失败 HTTP ${zipRes.status}`);
    const zip = await JSZip.loadAsync(await zipRes.arrayBuffer());
    const markdown = replaceDocumentImages(await markdownFromZip(zip));
    if (!markdown) throw new Error('MinerU 结果为空文本');
    return markdown;
  }
  throw new Error('MinerU 处理超时（10 分钟）');
}

async function processOpenMineru({ filePath, fileName, apiHost, apiKey, signal }) {
  const host = String(apiHost || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const buf = await fs.promises.readFile(filePath);
  const blob = new Blob([buf]);
  const form = new FormData();
  form.append('return_md', 'true');
  form.append('files', blob, fileName);
  const res = await fetch(`${host}/file_parse`, {
    method: 'POST',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    body: form,
    signal,
  });
  if (!res.ok) {
    throw new Error(`Open MinerU 失败 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/zip')) {
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const markdown = replaceDocumentImages(await markdownFromZip(zip));
    if (!markdown) throw new Error('Open MinerU 结果为空文本');
    return markdown;
  }
  const json = await res.json().catch(() => null);
  const markdown = replaceDocumentImages(String(
    json?.md_content || json?.markdown || json?.results?.[0]?.md_content || '',
  ));
  if (!markdown) throw new Error('Open MinerU 未返回 Markdown');
  return markdown;
}

async function processPdf(processorId, filePath, fileName, fileProcessing) {
  const controller = new AbortController();
  const work = processorId === 'open-mineru'
    ? processOpenMineru({
      filePath,
      fileName,
      apiHost: fileProcessing?.openMineru?.apiHost,
      apiKey: fileProcessing?.openMineru?.apiKey,
      signal: controller.signal,
    })
    : processMineru({
      filePath,
      fileName,
      apiHost: fileProcessing?.mineru?.apiHost,
      apiKey: fileProcessing?.mineru?.apiKey,
      signal: controller.signal,
    });
  try {
    return await withTimeout(work, PROCESSOR_TIMEOUT_MS, '文档处理');
  } catch (e) {
    controller.abort();
    throw e;
  }
}

async function extractItemText({ item, absPath, fileProcessing }) {
  if (item.type === 'note') {
    const text = String(item.noteContent || '').trim();
    if (!text) throw new Error('笔记为空');
    return text;
  }
  const ext = path.extname(item.sourceName || absPath).toLowerCase();
  if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    const text = (await readTextFile(absPath)).trim();
    if (!text) throw new Error('文件没有可索引文本');
    return text;
  }
  if (ext === '.docx') return readDocx(absPath);
  if (ext === '.pdf') {
    const processorId = fileProcessing?.processorId === 'open-mineru' ? 'open-mineru' : 'mineru';
    const configured = processorId === 'open-mineru'
      ? Boolean(String(fileProcessing?.openMineru?.apiHost || '').trim())
      : Boolean(String(fileProcessing?.mineru?.apiKey || '').trim());
    if (!configured) {
      throw new Error('未配置文档处理器，请到设置 → 文档处理完成配置');
    }
    return processPdf(processorId, absPath, item.sourceName, fileProcessing);
  }
  throw new Error(`不支持的文件类型：${ext || '未知'}`);
}

module.exports = {
  extractItemText,
  processMineru,
  processOpenMineru,
};
