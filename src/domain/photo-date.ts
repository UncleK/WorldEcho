/** Show only a year actually present in the supplied capture metadata. */
export function photoYear(value:string|null|undefined):string|null { return value?.match(/\b(?:18|19|20)\d{2}\b/)?.[0]??null; }
