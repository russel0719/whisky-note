import { Field, inputClass } from './form';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

/** 위스키 기본 정보 입력 필드 묶음. 시음 노트의 즉석 등록에서도 prefix를 붙여 재사용한다. */
export function WhiskyFields({ prefix = '' }: { prefix?: string }) {
  return (
    <div className="space-y-4">
      <Field label="이름" htmlFor={`${prefix}name`} required>
        <input
          id={`${prefix}name`}
          name={`${prefix}name`}
          required
          className={inputClass}
          placeholder="예: Glenfiddich 18"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="분류" htmlFor={`${prefix}category`} required>
          <select
            id={`${prefix}category`}
            name={`${prefix}category`}
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              선택
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="지역" htmlFor={`${prefix}region`}>
          <input
            id={`${prefix}region`}
            name={`${prefix}region`}
            className={inputClass}
            placeholder="예: 스페이사이드"
          />
        </Field>
      </div>
      <Field label="증류소 / 브랜드" htmlFor={`${prefix}distillery`}>
        <input
          id={`${prefix}distillery`}
          name={`${prefix}distillery`}
          className={inputClass}
          placeholder="예: Glenfiddich"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="도수 (%)" htmlFor={`${prefix}abv`}>
          <input
            id={`${prefix}abv`}
            name={`${prefix}abv`}
            type="number"
            step="0.1"
            min="1"
            max="99.9"
            className={inputClass}
            placeholder="43"
          />
        </Field>
        <Field label="숙성 (년)" htmlFor={`${prefix}age_years`}>
          <input
            id={`${prefix}age_years`}
            name={`${prefix}age_years`}
            type="number"
            min="1"
            className={inputClass}
            placeholder="18"
          />
        </Field>
        <Field label="캐스크" htmlFor={`${prefix}cask_type`}>
          <input
            id={`${prefix}cask_type`}
            name={`${prefix}cask_type`}
            className={inputClass}
            placeholder="셰리"
          />
        </Field>
      </div>
    </div>
  );
}
