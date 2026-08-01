import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- Kart ---------------- */

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          {title ? (
            <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          ) : (
            <span />
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------- Özet kutusu ---------------- */

const tonlar = {
  slate: "border-slate-200 bg-white text-slate-900",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  red: "border-rose-200 bg-rose-50 text-rose-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
} as const;

export function StatCard({
  label,
  value,
  hint,
  ton = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  ton?: keyof typeof tonlar;
}) {
  return (
    <div className={cx("rounded-lg border p-4 shadow-sm", tonlar[ton])}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs opacity-70">{hint}</div>}
    </div>
  );
}

/* ---------------- Rozet ---------------- */

export function Badge({
  children,
  ton = "slate",
}: {
  children: ReactNode;
  ton?: "slate" | "green" | "red" | "blue" | "amber";
}) {
  const map = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    red: "bg-rose-100 text-rose-800 ring-rose-200",
    blue: "bg-blue-100 text-blue-800 ring-blue-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        map[ton],
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Butonlar ---------------- */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";

const btnVariants = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400",
} as const;

type Variant = keyof typeof btnVariants;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cx(btnBase, btnVariants[variant], className)}
    />
  );
}

export function LinkButton({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link {...props} className={cx(btnBase, btnVariants[variant], className)} />
  );
}

/**
 * Dosya indirme gibi router navigasyonuna uygun olmayan hedefler için
 * düz <a>. (Next Link, route handler yanıtını RSC sanıp takılabiliyor.)
 */
export function AnchorButton({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return (
    <a {...props} className={cx(btnBase, btnVariants[variant], className)} />
  );
}

/* ---------------- Form alanları ---------------- */

export function Field({
  label,
  hata,
  hint,
  children,
  className,
}: {
  label: string;
  hata?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && !hata && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      {hata && (
        <span className="mt-1 block text-xs text-rose-600">{hata}</span>
      )}
    </label>
  );
}

export const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, className)} />;
}

/* ---------------- Uyarı kutusu ---------------- */

export function Alert({
  ton = "red",
  children,
}: {
  ton?: "red" | "green" | "amber" | "blue";
  children: ReactNode;
}) {
  const map = {
    red: "border-rose-200 bg-rose-50 text-rose-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return (
    <div className={cx("rounded-md border px-3 py-2 text-sm", map[ton])}>
      {children}
    </div>
  );
}

/* ---------------- Tablo ---------------- */

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm">{children}</table>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cx(
        "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
  ...props
}: ComponentProps<"td"> & {
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      {...props}
      className={cx(
        "border-b border-slate-100 px-3 py-2 align-middle",
        align === "right" && "tabular text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyRow({
  colSpan,
  children = "Kayıt bulunamadı.",
}: {
  colSpan: number;
  children?: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-8 text-center text-sm text-slate-500"
      >
        {children}
      </td>
    </tr>
  );
}

/* ---------------- Sayfa başlığı ---------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
