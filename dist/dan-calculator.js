function wholeNumber(value, min, label) {
  const n = Number(value);
  if (value === '' || value == null || !Number.isSafeInteger(n) || n < min) throw new Error(`${label}請填入至少 ${min} 的整數。`);
  return n;
}

export function stackBreakdown(quantity, stackSize) {
  const count = wholeNumber(quantity, 0, '材料個數');
  if (stackSize == null) return {quantity: count, stackSize: null, fullStacks: null, remainder: null, occupiedStacks: null};
  const size = wholeNumber(stackSize, 1, '每組上限');
  return {quantity: count, stackSize: size, fullStacks: Math.floor(count / size), remainder: count % size, occupiedStacks: Math.ceil(count / size)};
}

// Preserve raw material counts before the old spreadsheet rounds them to whole stacks.
export function materialQuantity(rawQuantity, repetitions = 1) {
  const times = wholeNumber(repetitions, 1, '份數');
  if (rawQuantity == null) return null;
  const value = Number(rawQuantity);
  if (!Number.isFinite(value) || value < 0) throw new Error('來源材料個數無效。');
  const result = Math.max(0, Math.ceil(value * times - 1e-9));
  if (!Number.isSafeInteger(result)) throw new Error('材料個數超出可計算範圍。');
  return result;
}

export function calculateBundle(bundle, itemCatalog, repetitions = 1, stackOverrides = {}, quantityOverrides = {}) {
  const times = wholeNumber(repetitions, 1, '份數');
  const rows = bundle.materials.map(material => {
    const item = itemCatalog[material.name] ?? {};
    const overridden = Object.hasOwn(stackOverrides, material.name);
    const stackSize = overridden ? (stackOverrides[material.name] === '' ? null : wholeNumber(stackOverrides[material.name], 1, '每組上限')) : item.currentStack ?? null;
    const quantityOverridden = Object.hasOwn(quantityOverrides, material.id);
    const quantity = quantityOverridden ? (quantityOverrides[material.id] === '' ? null : wholeNumber(quantityOverrides[material.id], 0, '材料個數')) : materialQuantity(material.quantity, times);
    const breakdown = quantity == null ? {quantity: null, stackSize, fullStacks: null, remainder: null, occupiedStacks: null} : stackBreakdown(quantity, stackSize);
    return {...material, ...breakdown, item, overridden, quantityOverridden, sourceGroups: material.sourceGroups == null ? null : material.sourceGroups * times};
  });
  return {rows, knownItemCount: rows.reduce((n, r) => n + (r.quantity ?? 0), 0), unknownQuantities: rows.filter(r => r.quantity == null).length,
    occupiedStacks: rows.reduce((n, r) => n + (r.occupiedStacks ?? 0), 0), unknownStacks: rows.filter(r => r.occupiedStacks == null).length};
}
