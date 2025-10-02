type Counter = { name: string; help?: string; value: number };

const counters = new Map<string, Counter>();

export const inc = (name: string, help?: string, by: number = 1) => {
  const c = counters.get(name) ?? { name, help, value: 0 };
  c.value += by;
  counters.set(name, c);
};

export const get = (name: string) => counters.get(name)?.value ?? 0;

export const resetAll = () => counters.clear();

export const exportPrometheus = () => {
  const lines: string[] = [];
  for (const c of counters.values()) {
    if (c.help) lines.push(`# HELP ${c.name} ${c.help}`);
    lines.push(`# TYPE ${c.name} counter`);
    lines.push(`${c.name} ${c.value}`);
  }
  return lines.join("\n");
};