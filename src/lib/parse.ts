import { CATEGORIES, type Category } from '@/lib/types';

export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalText(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? '').trim();
  return s || null;
}

export function parseWhiskyFields(formData: FormData, prefix = '') {
  const name = String(formData.get(`${prefix}name`) ?? '').trim();
  const category = String(formData.get(`${prefix}category`) ?? '');
  if (!name) return { error: '위스키 이름을 입력해주세요.' as const };
  if (!CATEGORIES.includes(category as Category))
    return { error: '분류를 선택해주세요.' as const };
  return {
    fields: {
      name,
      category,
      distillery: parseOptionalText(formData.get(`${prefix}distillery`)),
      region: parseOptionalText(formData.get(`${prefix}region`)),
      abv: parseOptionalNumber(formData.get(`${prefix}abv`)),
      age_years: parseOptionalNumber(formData.get(`${prefix}age_years`)),
      cask_type: parseOptionalText(formData.get(`${prefix}cask_type`)),
    },
  };
}
