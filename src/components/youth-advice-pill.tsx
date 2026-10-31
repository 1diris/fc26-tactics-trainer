import { ADVICE_LABEL, type YouthAction } from "@/lib/youth-advice";

const STYLE: Record<YouthAction, string> = {
  promote: "bg-ov-accent text-black font-semibold",
  keep: "border border-ov-accent text-ov-accent",
  loan: "border border-ov-warn text-ov-warn",
  release: "border border-ov-danger text-ov-danger",
  watch: "border border-ov-control text-ov-muted",
};

export function YouthAdvicePill({ action }: { action: YouthAction }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] ${STYLE[action]}`}
    >
      {ADVICE_LABEL[action]}
    </span>
  );
}
