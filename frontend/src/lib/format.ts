export function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

export function formatNumber(value: unknown) {
  const numberValue = Number(value);

  if (Number(isNaN(numberValue))) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function formatDays(value: unknown) {
  return `${formatNumber(value)} days`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("es-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
