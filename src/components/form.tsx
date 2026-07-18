/* 16px 미만이면 iOS가 포커스 시 화면을 자동 확대하므로 입력 폰트는 16px 고정 */
export const inputClass =
  'w-full h-11 px-3.5 rounded-(--radius-utility) bg-tile-1 border border-hairline placeholder:text-faint text-[16px]';

export const textareaClass =
  'w-full px-3.5 py-2.5 rounded-(--radius-utility) bg-tile-1 border border-hairline placeholder:text-faint text-[16px] leading-relaxed';

export function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm text-muted mb-1.5">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-12 rounded-full bg-accent text-on-accent font-semibold disabled:opacity-50"
    >
      {pending ? '저장 중…' : children}
    </button>
  );
}
