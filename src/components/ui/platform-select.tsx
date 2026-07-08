import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Select as RadixSelect,
  SelectTrigger as RadixTrigger,
  SelectContent as RadixContent,
  SelectItem as RadixItem,
  SelectValue as RadixValue,
  SelectGroup as RadixGroup,
} from "./select";
import { cn } from "@/lib/utils";

/**
 * Platform-aware Select. On the Capacitor Android WebView build, Radix's
 * portalled listbox can freeze touch/scroll handling on the underlying
 * page. This component swaps in a native <select> in that environment
 * while keeping the exact same API surface (Select/SelectTrigger/
 * SelectValue/SelectContent/SelectItem) on the web.
 */
function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return !!cap && typeof cap.getPlatform === "function" && cap.getPlatform() === "android";
}

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

type ItemInfo = { value: string; label: React.ReactNode; disabled?: boolean };

function collectItems(children: React.ReactNode): {
  items: ItemInfo[];
  triggerClass: string;
  triggerId?: string;
  placeholder?: string;
} {
  const items: ItemInfo[] = [];
  let triggerClass = "";
  let triggerId: string | undefined;
  let placeholder: string | undefined;

  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      const type = child.type as unknown;
      const props = child.props as Record<string, unknown>;
      if (type === SelectTrigger) {
        triggerClass = (props.className as string) ?? "";
        triggerId = props.id as string | undefined;
        React.Children.forEach(props.children as React.ReactNode, (c) => {
          if (React.isValidElement(c) && (c.type as unknown) === SelectValue) {
            placeholder = (c.props as { placeholder?: string }).placeholder;
          }
        });
      } else if (type === SelectContent || type === SelectGroup) {
        walk(props.children as React.ReactNode);
      } else if (type === SelectItem) {
        items.push({
          value: props.value as string,
          label: props.children as React.ReactNode,
          disabled: props.disabled as boolean | undefined,
        });
      }
    });
  };
  walk(children);
  return { items, triggerClass, triggerId, placeholder };
}

function renderLabel(label: React.ReactNode): string {
  if (label == null || typeof label === "boolean") return "";
  if (typeof label === "string" || typeof label === "number") return String(label);
  if (Array.isArray(label)) return label.map(renderLabel).join("");
  if (React.isValidElement(label)) {
    return renderLabel((label.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export function Select(props: SelectProps) {
  if (!isCapacitorAndroid()) {
    return (
      <RadixSelect
        value={props.value}
        defaultValue={props.defaultValue}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
      >
        {props.children}
      </RadixSelect>
    );
  }

  const { items, triggerClass, triggerId, placeholder } = collectItems(props.children);
  const currentValue = props.value ?? props.defaultValue ?? "";
  const showPlaceholder = currentValue === "" && placeholder != null;

  return (
    <div className="relative">
      <select
        id={triggerId}
        value={currentValue}
        disabled={props.disabled}
        onChange={(e) => props.onValueChange?.(e.target.value)}
        className={cn(
          "flex h-9 w-full appearance-none items-center rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          triggerClass,
        )}
      >
        {showPlaceholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((it) => (
          <option key={it.value} value={it.value} disabled={it.disabled}>
            {renderLabel(it.label)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50"
        aria-hidden="true"
      />
    </div>
  );
}

// Marker components: on the web they forward to Radix; on Capacitor
// Android they are only inspected by `collectItems` and never rendered.
export const SelectTrigger: typeof RadixTrigger = RadixTrigger;
export const SelectContent: typeof RadixContent = RadixContent;
export const SelectItem: typeof RadixItem = RadixItem;
export const SelectValue: typeof RadixValue = RadixValue;
export const SelectGroup: typeof RadixGroup = RadixGroup;