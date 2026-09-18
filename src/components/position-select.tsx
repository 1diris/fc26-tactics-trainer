import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POSITIONS, POSITION_GROUPS } from "@/lib/football";
import { positionFit } from "@/lib/formations";

const NONE = "__none";

export function suggestedPositions(current: string | null | undefined): string[] {
  if (!current) return [];
  return (POSITIONS as readonly string[]).filter(
    (position) => positionFit(position, current) !== "out",
  );
}

type Props = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Position used to compute the "Suggested" group (defaults to `value`). */
  suggestFrom?: string | null;
  allowEmpty?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
};

export function PositionSelect({
  value,
  onChange,
  suggestFrom,
  allowEmpty = false,
  id,
  className,
  placeholder = "Position",
}: Props) {
  const suggested = suggestedPositions(suggestFrom ?? value);
  const suggestedSet = new Set(suggested);

  return (
    <Select
      value={value ? value : allowEmpty ? NONE : undefined}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && (
          <SelectGroup>
            <SelectItem value={NONE}>–</SelectItem>
          </SelectGroup>
        )}
        {suggested.length > 0 && (
          <SelectGroup>
            <SelectLabel>Suggested</SelectLabel>
            {suggested.map((position) => (
              <SelectItem key={`suggested-${position}`} value={position}>
                {position}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {Object.entries(POSITION_GROUPS).map(([group, list]) => {
          const items = list.filter((position) => !suggestedSet.has(position));
          if (items.length === 0) return null;
          return (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {items.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
