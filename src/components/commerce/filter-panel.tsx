import Link from "next/link";
import type { Brand } from "@/domain/entities";

interface Props {
  brands: Brand[];
  current: Record<string, string | string[] | undefined>;
}

function val(current: Props["current"], key: string): string {
  const v = current[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Pure GET-form filters — URL-synchronized without client state.
 * Server-side rendering keeps every combination shareable.
 */
export function FilterPanel({ brands, current }: Props) {
  return (
    <form action="/watches" method="get" className="space-y-8">
      <div>
        <label htmlFor="f-q" className="label-imperial">
          Keyword
        </label>
        <input
          id="f-q"
          name="q"
          defaultValue={val(current, "q")}
          placeholder="Model, reference…"
          className="input-imperial"
        />
      </div>

      <div>
        <label htmlFor="f-brand" className="label-imperial">
          Great House
        </label>
        <select id="f-brand" name="brand" defaultValue={val(current, "brand")} className="input-imperial">
          <option value="">All houses</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label-imperial">Collection</legend>
        <div className="space-y-2">
          {["SATURN", "VINTAGE", "SPORTS", "DRESS", "DIVER"].map((c) => (
            <label key={c} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-travertine/85">
              <input
                type="checkbox"
                name="collection"
                value={c}
                defaultChecked={val(current, "collection")?.split(",").includes(c)}
                className="h-4 w-4 accent-[#b89b5e]"
              />
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="label-imperial">Price (USD)</span>
        <div className="flex items-center gap-2">
          <input
            name="min"
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={val(current, "min")}
            aria-label="Minimum price"
            className="input-imperial"
          />
          <span className="text-bronze">–</span>
          <input
            name="max"
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={val(current, "max")}
            aria-label="Maximum price"
            className="input-imperial"
          />
        </div>
      </div>

      <div>
        <label htmlFor="f-movement" className="label-imperial">
          Movement
        </label>
        <select id="f-movement" name="movement" defaultValue={val(current, "movement")} className="input-imperial">
          <option value="">Any</option>
          <option value="Automatic">Automatic</option>
          <option value="Manual">Manual</option>
          <option value="Quartz">Quartz</option>
        </select>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-imperial btn-solid flex-1">
          Apply
        </button>
        <Link href="/watches" className="btn-imperial btn-ghost flex-1">
          Reset
        </Link>
      </div>
    </form>
  );
}
