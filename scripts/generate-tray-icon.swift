// Run from the repository root: swift scripts/generate-tray-icon.swift
// Draw in points, then rasterize at 4x for clean edges at both menu-bar scales.
import AppKit

func makeIcon(scale: Int, destination: String) throws {
    let size = 16 * scale
    let oversample = 4
    let pixels = size * oversample
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let context = CGContext(data: nil, width: pixels, height: pixels,
                            bitsPerComponent: 8, bytesPerRow: pixels * 4,
                            space: colorSpace,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.scaleBy(x: CGFloat(pixels) / 16, y: CGFloat(pixels) / 16)
    context.translateBy(x: 0, y: 16)
    context.scaleBy(x: 1, y: -1)
    context.setStrokeColor(NSColor.black.cgColor)
    context.setFillColor(NSColor.black.cgColor)
    context.setLineWidth(1.35)
    context.setLineJoin(.round)
    context.setLineCap(.round)

    // Mirror both ears and cheeks around x = 8 for a balanced silhouette.
    context.move(to: CGPoint(x: 2.5, y: 7.0))
    context.addLine(to: CGPoint(x: 2.5, y: 2.2))
    context.addQuadCurve(to: CGPoint(x: 3.0, y: 2.0), control: CGPoint(x: 2.5, y: 1.7))
    context.addLine(to: CGPoint(x: 5.6, y: 4.5))
    context.addQuadCurve(to: CGPoint(x: 10.4, y: 4.5), control: CGPoint(x: 8.0, y: 3.8))
    context.addLine(to: CGPoint(x: 13.0, y: 2.0))
    context.addQuadCurve(to: CGPoint(x: 13.5, y: 2.2), control: CGPoint(x: 13.5, y: 1.7))
    context.addLine(to: CGPoint(x: 13.5, y: 7.0))
    context.addCurve(to: CGPoint(x: 8.0, y: 14.2), control1: CGPoint(x: 16.2, y: 10.9), control2: CGPoint(x: 13.0, y: 14.2))
    context.addCurve(to: CGPoint(x: 2.5, y: 7.0), control1: CGPoint(x: 3.0, y: 14.2), control2: CGPoint(x: -0.2, y: 10.9))
    context.closePath()
    context.strokePath()

    for x in [4.8, 9.8] {
        context.fillEllipse(in: CGRect(x: x, y: 8.1, width: 1.4, height: 1.8))
    }

    let output = CGContext(data: nil, width: size, height: size,
                           bitsPerComponent: 8, bytesPerRow: size * 4,
                           space: colorSpace,
                           bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    output.interpolationQuality = .high
    output.draw(context.makeImage()!, in: CGRect(x: 0, y: 0, width: size, height: size))
    let bitmap = NSBitmapImageRep(cgImage: output.makeImage()!)
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: destination))
}

try makeIcon(scale: 1, destination: "public/trayIconTemplate.png")
try makeIcon(scale: 2, destination: "public/trayIconTemplate@2x.png")
