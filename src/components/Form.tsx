import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type Values = Record<string, unknown>;

type Rule = {
  required?: boolean;
  whitespace?: boolean;
  message?: string;
  validator?: (rule: Rule, value: unknown) => Promise<unknown> | unknown;
};

export type FormStore = {
  get: () => Values;
  set: (name: string, value: unknown) => void;
  reset: (next: Values) => void;
  subscribe: (listener: () => void) => () => void;
  getFieldValue: (name: string) => unknown;
  setFieldValue: (name: string, value: unknown) => void;
  getFieldsValue: (all?: boolean) => Values;
  setFieldsValue: (patch: Values) => void;
};

const emptyStore: FormStore = {
  get: () => ({}),
  set: () => {},
  reset: () => {},
  subscribe: () => () => {},
  getFieldValue: () => undefined,
  setFieldValue: () => {},
  getFieldsValue: () => ({}),
  setFieldsValue: () => {},
};

function createStore(initial: Values = {}): FormStore {
  let values = { ...initial };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const set = (name: string, value: unknown) => {
    values = { ...values, [name]: value };
    emit();
  };
  return {
    get: () => values,
    set,
    reset: (next) => {
      values = { ...next };
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getFieldValue: (name) => values[name],
    setFieldValue: set,
    getFieldsValue: () => values,
    setFieldsValue: (patch) => {
      values = { ...values, ...patch };
      emit();
    },
  };
}

const FormContext = createContext<FormStore>(emptyStore);
const RulesContext = createContext<{
  register: (name: string, rules: Rule[] | undefined) => void;
  unregister: (name: string) => void;
}>({
  register: () => {},
  unregister: () => {},
});
const ErrorContext = createContext<Record<string, string>>({});

export function useForm(): [FormStore] {
  const store = useMemo(() => createStore(), []);
  useSyncExternalStore(store.subscribe, store.get, store.get);
  return [store];
}

function readEventValue(eventOrValue: unknown): unknown {
  if (
    eventOrValue &&
    typeof eventOrValue === "object" &&
    "target" in eventOrValue
  ) {
    const target = (eventOrValue as { target?: { value?: unknown } }).target;
    if (target && typeof target === "object" && "value" in target) return target.value;
  }
  return eventOrValue;
}

async function checkRules(rules: Rule[] | undefined, value: unknown): Promise<string | null> {
  if (!rules) return null;
  for (const rule of rules) {
    const text = typeof value === "string" ? value : value == null ? "" : String(value);
    if (rule.required && (value == null || text.trim() === "")) {
      return rule.message || "必填";
    }
    if (rule.whitespace && typeof value === "string" && value.trim() === "" && value !== "") {
      return rule.message || "不能为空";
    }
    if (rule.validator) {
      try {
        await rule.validator(rule, value);
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    }
  }
  return null;
}

export function FormItem({
  name,
  label,
  rules,
  children,
  className,
  normalize,
  valuePropName = "value",
  help,
}: {
  name?: string;
  label?: ReactNode;
  rules?: Rule[];
  children: ReactNode;
  className?: string;
  normalize?: (value: unknown) => unknown;
  valuePropName?: string;
  help?: ReactNode;
}) {
  const store = useContext(FormContext);
  const rulesApi = useContext(RulesContext);
  const errors = useContext(ErrorContext);
  const values = useSyncExternalStore(store.subscribe, store.get, store.get);
  if (name) rulesApi.register(name, rules);
  useEffect(() => {
    if (!name) return;
    return () => rulesApi.unregister(name);
  }, [name, rulesApi]);
  const error = name ? errors[name] : undefined;

  let control = children;
  if (name && store !== emptyStore && isValidElement(children)) {
    const current = values[name];
    const child = children as ReactElement<Record<string, unknown>>;
    control = cloneElement(child, {
      [valuePropName]:
        valuePropName === "checked" ? Boolean(current) : (current ?? child.props[valuePropName]),
      onChange: (eventOrValue: unknown) => {
        const raw = readEventValue(eventOrValue);
        store.set(name, normalize ? normalize(raw) : raw);
        const own = child.props.onChange;
        if (typeof own === "function") own(eventOrValue);
      },
      onCheckedChange: (checked: boolean) => {
        store.set(name, checked);
        const own = child.props.onCheckedChange;
        if (typeof own === "function") own(checked);
      },
    });
  }

  return (
    <label className={className} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? <span>{label}</span> : null}
      {control}
      {help ? <span>{help}</span> : null}
      {error ? <span style={{ color: "var(--rust)" }}>{error}</span> : null}
    </label>
  );
}

export function Form({
  form,
  initialValues,
  onFinish,
  onValuesChange,
  children,
  className,
}: {
  form?: FormStore;
  initialValues?: Values;
  onFinish?: (values: Values) => void;
  onValuesChange?: (changed: Values, all: Values) => void;
  children?: ReactNode;
  layout?: string;
  colon?: boolean;
  requiredMark?: boolean;
  className?: string;
}) {
  const owned = useMemo(() => form ?? createStore(), [form]);
  const rulesRef = useRef(new Map<string, Rule[] | undefined>());
  const rulesApi = useMemo(
    () => ({
      register: (name: string, rules: Rule[] | undefined) => rulesRef.current.set(name, rules),
      unregister: (name: string) => rulesRef.current.delete(name),
    }),
    [],
  );
  const seeded = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (initialValues) owned.reset({ ...initialValues });
  }, [initialValues, owned]);

  useEffect(() => {
    if (!onValuesChange) return;
    return owned.subscribe(() => onValuesChange({}, owned.get()));
  }, [onValuesChange, owned]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    for (const [field, rules] of rulesRef.current) {
      const message = await checkRules(rules, owned.get()[field]);
      if (message) next[field] = message;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onFinish?.(owned.get());
  };

  return (
    <FormContext.Provider value={owned}>
      <RulesContext.Provider value={rulesApi}>
        <ErrorContext.Provider value={errors}>
          <form className={className} onSubmit={onSubmit}>
            {children}
          </form>
        </ErrorContext.Provider>
      </RulesContext.Provider>
    </FormContext.Provider>
  );
}

Form.useForm = useForm;
