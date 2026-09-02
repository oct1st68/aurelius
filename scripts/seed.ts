/**
 * `pnpm data` — deterministic demo dataset for localhost development.
 * Creates ~10 brands, 36 listings, 5 sellers, 4 buyers, 1 authenticator,
 * 1 admin, offers, orders (in several states), reviews, certificates,
 * articles, notifications, price history, audit events, and demo watch
 * imagery as locally-generated SVG files (no network, no binaries).
 *
 * ALL inventory, price, and market data below is SIMULATED and exists only
 * to demonstrate the platform. Nothing here is real market data.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// The seed script runs via tsx outside Next — path aliases need explicit mapping.
import { hashPassword } from "../src/lib/auth/password";
import { maskSerial } from "../src/lib/auth/tokens";
import { store } from "../src/data/store/local-json-store";
import type {
  Article,
  AuditEventRow,
  Brand,
  Certificate,
  EmailMessage,
  Inspection,
  Listing,
  Notification,
  Offer,
  Order,
  OrderTimelineEvent,
  Payout,
  Payment,
  PricePoint,
  Review,
  RoleDefinition,
  Session,
  UploadedImage,
  User,
  WatchImage,
} from "../src/domain/entities";
import { ROLE_PERMISSIONS, type Role } from "../src/domain/enums";

const DATA_DIR = path.resolve(process.cwd(), "data/local");
const STORAGE_DIR = path.resolve(process.cwd(), "storage/local");

const DEMO_PASSWORD = process.env.AURELIUS_SEED_PASSWORD ?? "Aurelius#Demo2024";

let uuidCounter = 0;
function uid(prefix: string, key: string): string {
  return `${prefix}_seed${String(++uuidCounter).padStart(4, "0")}${key}`;
}
function iso(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Brands (The Great Houses) — fictionalized heritage houses
// ---------------------------------------------------------------------------

const BRANDS: Array<Pick<Brand, "name" | "slug" | "country" | "foundedYear" | "story">> = [
  { name: "Constantin Helios", slug: "constantin-helios", country: "Switzerland", foundedYear: 1755, story: "Founded above the ateliers of Genève, Constantin Helios built its name on ultra-thin complications for the courts of Europe. Every piece leaves the house only after 240 days of regulated observation." },
  { name: "Aurelius & Fils", slug: "aurelius-fils", country: "France", foundedYear: 1848, story: "A Parisian house devoted to the honest dial. Aurelius & Fils refused quartz in the 1970s and nearly perished for it — today that stubbornness is the brand." },
  { name: "Meridian & Söhne", slug: "meridian-sohne", country: "Germany", foundedYear: 1845, story: "Saxon precision, silver cases, and the famous outsize date. Meridian & Söhne rebuilt from ruins in 1949 and kept its balance cocks hand-engraved ever since." },
  { name: "House of Janus", slug: "house-of-janus", country: "Switzerland", foundedYear: 1860, story: "The two-faced house: reversible cases, dual-time dials, and a history of making watches for diplomats who cross time zones more often than borders." },
  { name: "Saturn & Co.", slug: "saturn-co", country: "United Kingdom", foundedYear: 1894, story: "London's chronometer maker to the Admiralty. Saturn & Co. deck watches kept fleet time for six decades; their vintage chronometers are the quiet stars of any auction." },
  { name: "Olympia Chronométrie", slug: "olympia-chronometrie", country: "Switzerland", foundedYear: 1901, story: "Born from the observatory trials of 1901, Olympia still publishes every certified rate. No marketing claims — only timing certificates." },
  { name: "Trajan Instruments", slug: "trajan-instruments", country: "Italy", foundedYear: 1937, story: "Florentine instrument-making married to Swiss movements. Trajan's cushion-cased divers of the 1950s defined la dolce vita underwater." },
  { name: "Minerva Horologie", slug: "minerva-horologie", country: "Switzerland", foundedYear: 1858, story: "The chronograph specialist: column wheels, big arrow lugs, and hand-finished bridges that collectors can identify from across a room." },
  { name: "Vestal & Roma", slug: "vestal-roma", country: "Italy", foundedYear: 1926, story: "Roman Art Déco dials and geometric cases. Vestal & Roma made wristwatches for the cinema's golden age and never lost the rear-projection glamour." },
  { name: "Aquilia Fabrica", slug: "aquilia-fabrica", country: "Switzerland", foundedYear: 1884, story: "The eagle factory. Aquilia built tool watches for engineers, pilots and field officers — cases you could drive a tank over, dials you could read at midnight." },
];

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

interface SeedPerson {
  email: string;
  displayName: string;
  roles: Role[];
  key: string;
}

const PEOPLE: SeedPerson[] = [
  { key: "admin", email: "admin@aurelius.local", displayName: "Marcus Aurelius (Admin)", roles: ["USER", "ADMIN"] },
  { key: "authenticator", email: "authenticator@aurelius.local", displayName: "Livia Veritas (Authenticator)", roles: ["USER", "AUTHENTICATOR"] },
  { key: "seller", email: "seller@aurelius.local", displayName: "Cassius Mercator (Seller)", roles: ["USER", "BUYER", "SELLER"] },
  { key: "seller2", email: "seller2@aurelius.local", displayName: "Atia Lux (Seller)", roles: ["USER", "BUYER", "SELLER"] },
  { key: "seller3", email: "seller3@aurelius.local", displayName: "Quintus Aureolus (Seller)", roles: ["USER", "BUYER", "SELLER"] },
  { key: "seller4", email: "seller4@aurelius.local", displayName: "Sabina Prima (Seller)", roles: ["USER", "BUYER", "SELLER"] },
  { key: "seller5", email: "seller5@aurelius.local", displayName: "Decimus Rex (Seller)", roles: ["USER", "BUYER", "SELLER"] },
  { key: "buyer", email: "buyer@aurelius.local", displayName: "Octavia Clara (Buyer)", roles: ["USER", "BUYER"] },
  { key: "buyer2", email: "buyer2@aurelius.local", displayName: "Lucius Felix (Buyer)", roles: ["USER", "BUYER"] },
  { key: "buyer3", email: "buyer3@aurelius.local", displayName: "Vibia Sabina (Buyer)", roles: ["USER", "BUYER"] },
  { key: "buyer4", email: "buyer4@aurelius.local", displayName: "Gaius Sabinus (Buyer)", roles: ["USER", "BUYER"] },
];

const ACCENTS = ["#B89B5E", "#4A1018", "#80684A", "#5B6B4A", "#3E4A6B", "#6B3E5B"];

// ---------------------------------------------------------------------------
// Listings — 36 simulated watches
// ---------------------------------------------------------------------------

interface SeedWatch {
  brandSlug: string;
  model: string;
  reference: string;
  year: number;
  movement: Listing["movement"];
  material: string;
  diameter: number;
  dial: string;
  bracelet: string;
  waterRes: number;
  functions: string[];
  powerReserve: number | null;
  condition: Listing["conditionGrade"];
  box: Listing["boxAndPapers"];
  collections: Listing["collections"];
  priceCents: number;
  sellerKey: string;
  description: string;
  vintage?: boolean;
}

const WATCHES: SeedWatch[] = [
  { brandSlug: "constantin-helios", model: "Patrimoine Tourbillon", reference: "CH-TP-4810", year: 2016, movement: "Manual", material: "18k Rose Gold", diameter: 39, dial: "Silvered Guilloché", bracelet: "Alligator Leather", waterRes: 30, functions: ["Tourbillon", "Small Seconds"], powerReserve: 80, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 4_850_000, sellerKey: "seller", description: "A one-owner Patrimoine Tourbillon delivered in 2016 and worn fewer than twenty times. The guilloché dial catches candle light the way the house intended in 1755. Complete with delivery papers, service card, and fitted travel case." },
  { brandSlug: "constantin-helios", model: "Historiques Ultra-Fine 1955", reference: "CH-UF-1955", year: 1968, movement: "Manual", material: "18k Yellow Gold", diameter: 34, dial: "Champagne", bracelet: "18k Gold Buckle", waterRes: 0, functions: ["Hours", "Minutes"], powerReserve: 40, condition: "EXCELLENT", box: "PAPERS_ONLY", collections: ["SATURN", "VINTAGE", "DRESS"], priceCents: 1_285_000, sellerKey: "seller2", description: "A 1968 Ultra-Fine with the original champagne dial and unpolished case. The kind of watch that makes dealers whisper. Extract of archive included.", vintage: true },
  { brandSlug: "constantin-helios", model: "Overseas GMT", reference: "CH-OS-7900", year: 2021, movement: "Automatic", material: "Stainless Steel", diameter: 41, dial: "Midnight Blue", bracelet: "Steel Bracelet", waterRes: 150, functions: ["GMT", "Date"], powerReserve: 70, condition: "EXCELLENT", box: "FULL_SET", collections: ["SPORTS"], priceCents: 2_145_000, sellerKey: "seller3", description: "Travel-ready, bracelet-integrated, blue-dial GMT from the current Overseas generation. Two years old with full set." },
  { brandSlug: "aurelius-fils", model: "Ronde Solaire", reference: "AF-RS-2210", year: 2019, movement: "Automatic", material: "Steel & 18k Gold", diameter: 38, dial: "Cream Lacquer", bracelet: "Calfskin", waterRes: 50, functions: ["Date", "Small Seconds"], powerReserve: 42, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 685_000, sellerKey: "seller", description: "The Ronde Solaire is Aurelius & Fils at its most honest: a cream lacquer dial, a rail-track minute chapter, and nothing else that does not need to be there." },
  { brandSlug: "aurelius-fils", model: "Calatrava Pilote 1941", reference: "AF-CP-1941", year: 1954, movement: "Manual", material: "Nickel Chrome", diameter: 36, dial: "Black Gilt", bracelet: "Vintage Leather", waterRes: 0, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 38, condition: "VERY_GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE"], priceCents: 415_000, sellerKey: "seller4", description: "Gilt section dial with warm radium patina, caseback engraving of the original owner's initials — discreet and correct. A true pilot's watch from the reconstruction years.", vintage: true },
  { brandSlug: "meridian-sohne", model: "Lange 1", reference: "MS-L1-191", year: 2015, movement: "Manual", material: "18k White Gold", diameter: 38, dial: "Solid Silver", bracelet: "Alligator Leather", waterRes: 30, functions: ["Outsize Date", "Power Reserve", "Small Seconds"], powerReserve: 72, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 3_120_000, sellerKey: "seller2", description: "The Saxon icon in white gold: off-center hours, subsidiary seconds, outsize date and a power-reserve dial — the geometry that rebuked an entire industry." },
  { brandSlug: "meridian-sohne", model: "Saxonia Thin 37mm", reference: "MS-ST-205", year: 2018, movement: "Manual", material: "18k Rose Gold", diameter: 37, dial: "Grisaille", bracelet: "Alligator Leather", waterRes: 30, functions: ["Hours", "Minutes", "Small Seconds"], powerReserve: 72, condition: "EXCELLENT", box: "FULL_SET", collections: ["DRESS"], priceCents: 1_690_000, sellerKey: "seller5", description: "6.2mm thin, two hands and a small seconds — the quietest thing you can put on a wrist in a boardroom." },
  { brandSlug: "house-of-janus", model: "Reverso Duoface", reference: "HJ-RD-389", year: 2013, movement: "Manual", material: "Steel", diameter: 28, dial: "Slate & Silver", bracelet: "Steel Bracelet", waterRes: 30, functions: ["Dual Time", "Day/Night"], powerReserve: 42, condition: "EXCELLENT", box: "FULL_SET", collections: ["DRESS"], priceCents: 745_000, sellerKey: "seller", description: "Two dials, one flip. The Duoface carries a second time zone on its reverse — Janus for the frequent flyer." },
  { brandSlug: "house-of-janus", model: "Memovox Reveil 1959", reference: "HJ-MV-889", year: 1959, movement: "Manual", material: "Stainless Steel", diameter: 37, dial: "Two-Tone Silver", bracelet: "Beads of Rice", waterRes: 0, functions: ["Alarm", "Date"], powerReserve: 40, condition: "VERY_GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE"], priceCents: 345_000, sellerKey: "seller4", description: "The famous wrist alarm, still ringing true. Two-tone dial with crosshair, correct crowns, and a case that has never seen a polishing wheel.", vintage: true },
  { brandSlug: "saturn-co", model: "Admiralty Deck Chronometer", reference: "SC-AD-1943", year: 1943, movement: "Manual", material: "Brass Gimbal", diameter: 95, dial: "Black Enamel", bracelet: "Gimbal Mount", waterRes: 0, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 56, condition: "GOOD", box: "PAPERS_ONLY", collections: ["SATURN", "VINTAGE"], priceCents: 285_000, sellerKey: "seller3", description: "A wartime deck chronometer with Admiralty arrow engravings and its original gimbal. Keeping time within 2 seconds a day after eighty years.", vintage: true },
  { brandSlug: "saturn-co", model: "Marine Standard 1940", reference: "SC-MS-1140", year: 1962, movement: "Manual", material: "Nickel Chrome", diameter: 35, dial: "Matte Black", bracelet: "Canvas Strap", waterRes: 0, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 44, condition: "VERY_GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE"], priceCents: 145_000, sellerKey: "seller5", description: "Fleet-issue dial with broad arrow, luminous compound untouched. The honest everyday chronometer of a junior officer.", vintage: true },
  { brandSlug: "olympia-chronometrie", model: "Observatory 1901", reference: "OC-OB-1901", year: 1974, movement: "Manual", material: "18k Yellow Gold", diameter: 36, dial: "Porcelain White", bracelet: "Suede Strap", waterRes: 0, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 50, condition: "EXCELLENT", box: "PAPERS_ONLY", collections: ["SATURN", "VINTAGE", "DRESS"], priceCents: 525_000, sellerKey: "seller", description: "A watch whose movement spent 45 days on the observatory timing machine before casing. The porcelain dial is flawless; the rate certificate is framed.", vintage: true },
  { brandSlug: "olympia-chronometrie", model: "Regatta Yacht Timer", reference: "OC-RY-88", year: 2008, movement: "Automatic", material: "Titanium", diameter: 44, dial: "Regatta Blue", bracelet: "Rubber", waterRes: 300, functions: ["Regatta Countdown", "Date"], powerReserve: 60, condition: "GOOD", box: "BOX_ONLY", collections: ["SPORTS", "DIVER"], priceCents: 385_000, sellerKey: "seller4", description: "Titanium case, countdown bezel, and a blue dial the colour of the Ligurian Sea in May. Cosmetic scratches from three seasons of honest sailing." },
  { brandSlug: "trajan-instruments", model: "Cushion Diver 1957", reference: "TI-CD-5721", year: 1965, movement: "Automatic", material: "Stainless Steel", diameter: 40, dial: "Tropical Brown", bracelet: "Tropic Rubber", waterRes: 200, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 48, condition: "VERY_GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE", "DIVER"], priceCents: 395_000, sellerKey: "seller2", description: "The dial turned a warm tropical brown decades ago and collectors pay precisely for that. Double-signed caseback, original crown.", vintage: true },
  { brandSlug: "trajan-instruments", model: "Buonarroti Chronograph", reference: "TI-BC-118", year: 2020, movement: "Manual", material: "Steel", diameter: 40, dial: "Silver Panda", bracelet: "Calfskin", waterRes: 50, functions: ["Chronograph", "Tachymeter"], powerReserve: 60, condition: "MINT", box: "FULL_SET", collections: ["SPORTS"], priceCents: 465_000, sellerKey: "seller", description: "Column-wheel chronograph with panda dial, made in a series of 250. Italian case design, Swiss heart." },
  { brandSlug: "minerva-horologie", model: "Big Arrow Chronograph 1946", reference: "MH-BA-4613", year: 1951, movement: "Manual", material: "Stainless Steel", diameter: 38, dial: "Sector Grey", bracelet: "Vintage Leather", waterRes: 0, functions: ["Chronograph"], powerReserve: 45, condition: "VERY_GOOD", box: "PAPERS_ONLY", collections: ["SATURN", "VINTAGE"], priceCents: 890_000, sellerKey: "seller3", description: "The archetypal Big Arrow: sector dial, telemetric scale, and lugs you could hang a coat on. Correct and unmolested.", vintage: true },
  { brandSlug: "minerva-horologie", model: "Pythagore 38", reference: "MH-PT-3812", year: 2017, movement: "Manual", material: "18k Rose Gold", diameter: 38, dial: "Argenté", bracelet: "Alligator Leather", waterRes: 30, functions: ["Small Seconds"], powerReserve: 65, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 1_295_000, sellerKey: "seller5", description: "Hand-finished bridges visible through the sapphire back — anglage done the way it was in 1939, because at Minerva it still is." },
  { brandSlug: "vestal-roma", model: "Cinema Art Déco 1929", reference: "VR-AD-9291", year: 1972, movement: "Manual", material: "18k White Gold", diameter: 26, dial: "Onyx & Radium", bracelet: "Milanese Mesh", waterRes: 0, functions: ["Hours", "Minutes"], powerReserve: 36, condition: "EXCELLENT", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE", "DRESS"], priceCents: 245_000, sellerKey: "seller4", description: "Geometric white-gold case, onyx dial, radium hands unbothered by fashion. Made for the era of rear-projection and evening gloves.", vintage: true },
  { brandSlug: "vestal-roma", model: "Trastevere Moonphase", reference: "VR-TM-3311", year: 2012, movement: "Automatic", material: "Steel & Rose Gold", diameter: 39, dial: "Aventurine", bracelet: "Suede", waterRes: 30, functions: ["Moonphase", "Date"], powerReserve: 42, condition: "EXCELLENT", box: "FULL_SET", collections: ["DRESS"], priceCents: 395_000, sellerKey: "seller", description: "Aventurine dial like a Roman night sky, moonphase correct to a day in 122 years." },
  { brandSlug: "aquilia-fabrica", model: "Field Officer Mk II", reference: "AF-FO-6602", year: 1970, movement: "Manual", material: "Matte Steel", diameter: 36, dial: "Matte Black", bracelet: "NATO Canvas", waterRes: 0, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 40, condition: "GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE"], priceCents: 115_000, sellerKey: "seller2", description: "Service dial, Tritium plots intact, broad arrow caseback. The kind of watch that did its job for forty years and asks for another forty.", vintage: true },
  { brandSlug: "aquilia-fabrica", model: "Pilot Flieger 44", reference: "AF-PF-4410", year: 2022, movement: "Automatic", material: "Brushed Steel", diameter: 44, dial: "Black Matte", bracelet: "Calfskin", waterRes: 100, functions: ["GMT", "Date"], powerReserve: 70, condition: "MINT", box: "FULL_SET", collections: ["SPORTS"], priceCents: 298_000, sellerKey: "seller5", description: "Modern Flieger with oversized crown and historical triangle dial — built for gloved hands and dark cockpits." },
  { brandSlug: "constantin-helios", model: "Jubilé Perpetual Calendar", reference: "CH-PC-9900", year: 2005, movement: "Automatic", material: "Platinum", diameter: 39, dial: "Blue Enamel", bracelet: "Alligator Leather", waterRes: 30, functions: ["Perpetual Calendar", "Moonphase", "Leap Year"], powerReserve: 60, condition: "EXCELLENT", box: "FULL_SET", collections: ["DRESS"], priceCents: 5_690_000, sellerKey: "seller3", description: "Platinum case, grand feu enamel dial, perpetual calendar correct until 2100. The house's anniversary masterpiece." },
  { brandSlug: "meridian-sohne", model: "Pour le Mérite Tourbillon", reference: "MS-PLM-702", year: 2011, movement: "Manual", material: "18k Rose Gold", diameter: 39, dial: "Lavender Guilloché", bracelet: "Alligator Leather", waterRes: 30, functions: ["Fusee Tourbillon", "Power Reserve"], powerReserve: 50, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 7_250_000, sellerKey: "seller4", description: "The chain-and-fusee tourbillon — Saxon watchmaking answering a question most houses never dared ask. Delivered new in 2011." },
  { brandSlug: "saturn-co", model: "Greenwich Observatory 1926", reference: "SC-GO-2619", year: 1938, movement: "Manual", material: "Silver", diameter: 52, dial: "White Enamel", bracelet: "Display Stand", waterRes: 0, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 52, condition: "FAIR", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE"], priceCents: 98_000, sellerKey: "seller5", description: "A silver-cased observatory timekeeper with hairlines and a story. Sold as a collector's piece with original stand.", vintage: true },
  { brandSlug: "olympia-chronometrie", model: "Chronomètre Souverain", reference: "OC-CS-701", year: 2019, movement: "Manual", material: "18k Rose Gold", diameter: 40, dial: "Silver Two-Register", bracelet: "Alligator Leather", waterRes: 30, functions: ["Small Seconds", "Power Reserve"], powerReserve: 56, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 2_480_000, sellerKey: "seller", description: "Two-register silver dial on a rose-gold case, certified to ±1 sec/day. The watch for people who check the tide tables." },
  { brandSlug: "trajan-instruments", model: "Romulo GMT Ceramica", reference: "TI-RG-2244", year: 2023, movement: "Automatic", material: "Steel & Ceramic", diameter: 42, dial: "Roman Ivory", bracelet: "Steel Bracelet", waterRes: 200, functions: ["GMT", "Date"], powerReserve: 72, condition: "MINT", box: "FULL_SET", collections: ["SPORTS"], priceCents: 445_000, sellerKey: "seller4", description: "Ceramic GMT bezel over an ivory lacquer dial with applied Roman numerals — Trajan's statement piece for the jet age." },
  { brandSlug: "minerva-horologie", model: "Outlier Monopusher", reference: "MH-OM-1955", year: 1958, movement: "Manual", material: "Stainless Steel", diameter: 37, dial: "Black Gloss", bracelet: "Vintage Leather", waterRes: 0, functions: ["Monopusher Chronograph"], powerReserve: 45, condition: "EXCELLENT", box: "PAPERS_ONLY", collections: ["SATURN", "VINTAGE"], priceCents: 645_000, sellerKey: "seller2", description: "Glossy black dial, single pusher, column wheel — the purist's chronograph from the decade of terminals and tailfins.", vintage: true },
  { brandSlug: "vestal-roma", model: "Pantheon Grande Date", reference: "VR-PGD-7750", year: 2007, movement: "Automatic", material: "18k Rose Gold", diameter: 40, dial: "Guilloché Champagne", bracelet: "Rose Gold Bracelet", waterRes: 30, functions: ["Big Date", "Power Reserve"], powerReserve: 48, condition: "VERY_GOOD", box: "BOX_ONLY", collections: ["DRESS"], priceCents: 545_000, sellerKey: "seller3", description: "Champagne guilloché with an outsized double-window date. Rose gold bracelet, box included." },
  { brandSlug: "aquilia-fabrica", model: "Aquila Diver 600", reference: "AF-AD-600M", year: 2015, movement: "Automatic", material: "Titanium", diameter: 45, dial: "Abyss Green", bracelet: "Rubber", waterRes: 600, functions: ["Helium Valve", "Date"], powerReserve: 70, condition: "EXCELLENT", box: "FULL_SET", collections: ["DIVER", "SPORTS"], priceCents: 365_000, sellerKey: "seller5", description: "Helium valve, 600m rating, abyss-green dial. Dived twice, dried once, stored properly since." },
  { brandSlug: "house-of-janus", model: "Grande Reverso Ultra Thin", reference: "HJ-GR-1931", year: 2014, movement: "Manual", material: "Steel", diameter: 27, dial: "Black Laqué", bracelet: "Alligator Leather", waterRes: 30, functions: ["Hours", "Minutes"], powerReserve: 40, condition: "EXCELLENT", box: "FULL_SET", collections: ["DRESS"], priceCents: 385_000, sellerKey: "seller", description: "The 1931 tribology in a 7.2mm body. Flip it and the caseback takes an engraving like 1931 wished it could." },
  { brandSlug: "constantin-helios", model: "World Time Genève", reference: "CH-WT-7710", year: 2004, movement: "Automatic", material: "18k Yellow Gold", diameter: 37, dial: "Cloisonné Enamel Map", bracelet: "Alligator Leather", waterRes: 30, functions: ["World Time", "24h Display"], powerReserve: 40, condition: "EXCELLENT", box: "FULL_SET", collections: ["DRESS"], priceCents: 4_150_000, sellerKey: "seller2", description: "Cloisonné enamel world map, 37 cities, yellow gold. A pocket-watch soul in a wristwatch." },
  { brandSlug: "meridian-sohne", model: "Odysseus Sport", reference: "MS-OD-3636", year: 2022, movement: "Automatic", material: "Steel", diameter: 40, dial: "Aventurine Blue", bracelet: "Steel Bracelet", waterRes: 120, functions: ["Date", "Day"], powerReserve: 50, condition: "MINT", box: "FULL_SET", collections: ["SPORTS"], priceCents: 1_150_000, sellerKey: "seller3", description: "The Saxon house's integrated-bracelet sports watch — aventurine blue dial that reads like a night sky under office lights." },
  { brandSlug: "olympia-chronometrie", model: "Ultra-Chron Diver 1968", reference: "OC-UD-6842", year: 1968, movement: "Automatic", material: "Stainless Steel", diameter: 40, dial: "Orange Gradient", bracelet: "Gay Frères Bracelet", waterRes: 200, functions: ["Hours", "Minutes", "Seconds"], powerReserve: 44, condition: "VERY_GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE", "DIVER"], priceCents: 365_000, sellerKey: "seller4", description: "High-beat diver with gradient orange dial and Gay Frères bracelet — 36,000 vph of 1968 optimism.", vintage: true },
  { brandSlug: "saturn-co", model: "Heritage Chronograph 1942", reference: "SC-HC-4212", year: 1946, movement: "Manual", material: "Stainless Steel", diameter: 36, dial: "Blue Gilt", bracelet: "Vintage Leather", waterRes: 0, functions: ["Chronograph", "Telemeter"], powerReserve: 42, condition: "VERY_GOOD", box: "NO_BOX_PAPERS", collections: ["SATURN", "VINTAGE"], priceCents: 465_000, sellerKey: "seller5", description: "Blue gilt two-register chronograph with telemeter scale, unmoved since the war ended.", vintage: true },
  { brandSlug: "aurelius-fils", model: "Emperador Jade", reference: "AF-EJ-8808", year: 2021, movement: "Automatic", material: "18k White Gold", diameter: 41, dial: "Imperial Jade", bracelet: "Alligator Leather", waterRes: 30, functions: ["Date", "Small Seconds"], powerReserve: 45, condition: "MINT", box: "FULL_SET", collections: ["DRESS"], priceCents: 2_650_000, sellerKey: "seller", description: "Imperial jade dial, white gold case, and the good sense to stop there. One of twelve made." },
  { brandSlug: "trajan-instruments", model: "Campus Quartz 34", reference: "TI-CQ-3412", year: 1996, movement: "Quartz", material: "Steel", diameter: 34, dial: "Ivory", bracelet: "Steel Bracelet", waterRes: 50, functions: ["Date"], powerReserve: null, condition: "GOOD", box: "NO_BOX_PAPERS", collections: [], priceCents: 24_500, sellerKey: "seller2", description: "A honest little quartz campus watch from the sensible years — the only piece here you could lose and replace.", vintage: true },
];

// ---------------------------------------------------------------------------
// Helpers for media
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svgWatchImage(brand: string, model: string, dial: string, accent: string): string {
  const dialBg = dial.toLowerCase().includes("black") ? "#101010" : dial.toLowerCase().includes("blue") ? "#1a2a4a" : "#e8e0d2";
  const textColor = dialBg === "#e8e0d2" ? "#0b0b0b" : "#e8e0d2";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <radialGradient id="bg" cx="50%" cy="34%" r="85%">
      <stop offset="0%" stop-color="#efe9dd"/>
      <stop offset="70%" stop-color="#e2dbcd"/>
      <stop offset="100%" stop-color="#d6cebe"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d8cfae"/>
      <stop offset="50%" stop-color="#b89b5e"/>
      <stop offset="100%" stop-color="#7a6238"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="1380" fill="none" stroke="#786044" stroke-opacity="0.28" stroke-width="1.5"/>
  <circle cx="600" cy="700" r="330" fill="none" stroke="url(#metal)" stroke-width="46"/>
  <circle cx="600" cy="700" r="290" fill="${dialBg}"/>
  ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
    .map((a) => `<line x1="${600 + 250 * Math.cos((a * Math.PI) / 180)}" y1="${700 + 250 * Math.sin((a * Math.PI) / 180)}" x2="${600 + 275 * Math.cos((a * Math.PI) / 180)}" y2="${700 + 275 * Math.sin((a * Math.PI) / 180)}" stroke="${textColor}" stroke-width="6" stroke-opacity="0.85"/>`)
    .join("\n  ")}
  <line x1="600" y1="700" x2="600" y2="530" stroke="${textColor}" stroke-width="10" stroke-linecap="round"/>
  <line x1="600" y1="700" x2="718" y2="760" stroke="${textColor}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="600" cy="700" r="10" fill="${accent}"/>

</svg>`;
}

function svgEditorial(title: string): string {
  title = esc(title);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#0b0b0b"/>
  <rect x="50" y="50" width="1500" height="800" fill="none" stroke="#b89b5e" stroke-opacity="0.4" stroke-width="2"/>
  <circle cx="800" cy="450" r="240" fill="none" stroke="#b89b5e" stroke-width="3" stroke-opacity="0.6"/>
  <line x1="800" y1="450" x2="800" y2="290" stroke="#e8e0d2" stroke-width="5"/>
  <line x1="800" y1="450" x2="920" y2="510" stroke="#e8e0d2" stroke-width="4"/>
</svg>`;
}

async function writeMedia(relPath: string, svg: string): Promise<void> {
  const abs = path.join(STORAGE_DIR, relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, svg, "utf8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  // Deploy-safe default: seed only an empty register. `pnpm data` passes --force to reset.
  if (!force) {
    const usersFile = path.join(DATA_DIR, "users.json");
    try {
      const existing = JSON.parse(await (await import("node:fs/promises")).readFile(usersFile, "utf8")) as unknown[];
      if (Array.isArray(existing) && existing.length > 0) {
        console.log("Register already populated — skipping seed (use `pnpm data` to reset).");
        return;
      }
    } catch {
      /* empty register — continue seeding */
    }
  }

  console.log("AURELIUS seed — building the register…");
  uuidCounter = 0;
  const t0 = Date.now();

  // 1. Reset
  await store.ensureDir();
  for (const name of [
    "users", "sessions", "reset-tokens", "roles", "brands", "listings", "price-history",
    "offers", "cart-items", "vault-entries", "orders", "payments", "payouts",
    "inspections", "certificates", "passports", "reviews", "notifications",
    "articles", "emails", "audit-events", "uploaded-images",
  ]) {
    await store.writeCollection(name, []);
  }
  await rm(path.join(STORAGE_DIR, "uploads"), { recursive: true, force: true });
  await rm(path.join(STORAGE_DIR, "media"), { recursive: true, force: true });

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // 2. Roles
  const roles: RoleDefinition[] = (["USER", "BUYER", "SELLER", "AUTHENTICATOR", "ADMIN"] as Role[]).map(
    (name, i) => ({
      id: uid("prf", "role" + i),
      name,
      description: `${name} — built-in role`,
      permissions: [...ROLE_PERMISSIONS[name]],
      createdAt: iso(90),
      updatedAt: iso(90),
    }),
  );
  await store.writeCollection("roles", roles);

  // 3. Users
  const users: User[] = PEOPLE.map((p, i) => ({
    id: uid("usr", p.key),
    email: p.email,
    passwordHash,
    displayName: p.displayName,
    roles: p.roles,
    status: "ACTIVE",
    accent: ACCENTS[i % ACCENTS.length] as string,
    createdAt: iso(80 - i),
    updatedAt: iso(80 - i),
  }));
  await store.writeCollection("users", users);
  const userByKey = new Map(PEOPLE.map((p, i) => [p.key, users[i] as User]));

  // 4. Brands + hero media
  const brandRows: Brand[] = [];
  for (const [i, b] of BRANDS.entries()) {
    const hero = `photos/w${String(((i + 5) % 26) + 1).padStart(2, "0")}.jpg`;
    brandRows.push({
      id: uid("brd", b.slug),
      name: b.name,
      slug: b.slug,
      country: b.country,
      foundedYear: b.foundedYear,
      story: b.story,
      heroImage: hero,
      createdAt: iso(75),
      updatedAt: iso(75),
    });
  }
  await store.writeCollection("brands", brandRows);
  const brandBySlug = new Map(BRANDS.map((b, i) => [b.slug, brandRows[i] as Brand]));
  // 5. Listings + images + price history
  const listings: Listing[] = [];
  const priceHistory: PricePoint[] = [];
  const uploadedImages: UploadedImage[] = [];
  const serialPrefixes = ["AUR", "VST", "MRC", "SAT", "OLY", "TRJ", "MNH", "VSR", "AQL", "CNH"];

  for (const [i, w] of WATCHES.entries()) {
    const brand = brandBySlug.get(w.brandSlug) as Brand;
    const seller = userByKey.get(w.sellerKey) as User;
    const slug = `${w.brandSlug}-${w.model}-${w.reference}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
    // Curated photo slots for the most visible listings (homepage hero, curator's lot,
    // top catalog cards). Keys are reference numbers. Values are verified photo cells.
    // Homepage-visible listings get the one verified brand-neutral photo (w20).
    // ponytail: single-image galleries for hero slots; a real photo shoot replaces this.
    const photoOverrides = new Map<string, number[]>([
      ["MS-PLM-702", [20]],   // Pour le Mérite Tourbillon — homepage hero
      ["CH-PC-9900", [20]],   // Jubilé Perpetual Calendar — curator's lot
      ["MS-L1-191", [20]],    // Lange 1
      ["CH-TP-4810", [20]],   // Patrimoine Tourbillon
      ["CH-WT-7710", [20]],   // World Time Genève
      ["MS-OD-3636", [20]],   // Odysseus Sport
      ["AF-EJ-8808", [20]],   // Emperador Jade
    ]);
    const override = photoOverrides.get(w.reference);

    const images: WatchImage[] = [];
    for (let shot = 0; shot < 3; shot++) {
      const imgId = uid("img", `l${i}v${shot}`);
      // Deterministic curated photography (see storage/local/photos/CREDITS.md)
      const photoNum = override ? override[0] as number : ((i * 3 + shot) % 26) + 1;
      const relPath = `photos/w${String(photoNum).padStart(2, "0")}.jpg`;
      const altShot = ["Front", "Angle", "Detail"][shot] as string;
      images.push({
        id: imgId,
        path: relPath,
        alt: `${brand.name} ${w.model} — ${altShot.toLowerCase()} view`,
        width: 1200,
        height: 1500,
      });
      uploadedImages.push({
        id: imgId,
        uploaderId: seller.id,
        listingId: null,
        path: relPath,
        originalName: `${slug}-${shot}.jpg`,
        mime: "image/jpeg",
        bytes: 180_000,
        width: 1200,
        height: 1500,
        createdAt: iso(40 - (i % 30)),
        updatedAt: iso(40 - (i % 30)),
      });
    }
    const serial = `${serialPrefixes[i % serialPrefixes.length]}${(1_000_000 + i * 7919).toString().slice(0, 6)}${String.fromCharCode(65 + (i % 26))}`;
    const createdAt = iso(45 - (i % 40));
    const listing: Listing = {
      id: uid("wat", `l${i}`),
      slug,
      sellerId: seller.id,
      brandId: brand.id,
      model: w.model,
      referenceNumber: w.reference,
      year: w.year,
      movement: w.movement,
      caseMaterial: w.material,
      caseDiameterMm: w.diameter,
      dialColor: w.dial,
      bracelet: w.bracelet,
      waterResistanceM: w.waterRes,
      functions: w.functions,
      powerReserveHours: w.powerReserve,
      conditionGrade: w.condition,
      conditionNotes: w.vintage
        ? "Honest vintage wear; see photographs. Serviced in-house unless noted."
        : "Light careful use; no dings, no polish needed.",
      boxAndPapers: w.box,
      documentation: w.box === "FULL_SET" ? ["Warranty card", "Archive extract"] : w.box === "PAPERS_ONLY" ? ["Archive extract"] : [],
      serviceHistory: w.vintage ? "Full service 2023 by house-approved watchmaker" : "Factory service not yet due",
      images,
      price: { amountCents: w.priceCents, currency: "USD" },
      collections: w.collections,
      serialNumber: serial,
      status: "PUBLISHED",
      moderationNote: null,
      description: w.description,
      createdAt,
      updatedAt: createdAt,
    };
    listings.push(listing);
    priceHistory.push({
      id: uid("prf", `ph${i}a`),
      listingId: listing.id,
      at: createdAt,
      priceCents: w.priceCents,
      currency: "USD",
      kind: "LIST",
      createdAt,
      updatedAt: createdAt,
    });
    // Simulated price drop for a handful of listings
    if (i % 9 === 4) {
      const dropped = Math.round(w.priceCents * 0.92);
      listing.price = { amountCents: dropped, currency: "USD" };
      listing.updatedAt = iso(6);
      priceHistory.push({
        id: uid("prf", `ph${i}b`),
        listingId: listing.id,
        at: iso(6),
        priceCents: dropped,
        currency: "USD",
        kind: "PRICE_DROP",
        createdAt: iso(6),
        updatedAt: iso(6),
      });
    }
  }
  await store.writeCollection("listings", listings);
  await store.writeCollection("price-history", priceHistory);
  await store.writeCollection("uploaded-images", uploadedImages);

  // 6. Offers (various states)
  const offers: Offer[] = [];
  const mkOffer = (i: number, listingIdx: number, buyerKey: string, amountCents: number, status: Offer["status"], daysAgo: number, parent?: Offer): Offer => {
    const listing = listings[listingIdx] as Listing;
    const buyer = userByKey.get(buyerKey) as User;
    const threadId = parent?.threadId ?? uid("prf", `thr${i}`);
    const offer: Offer = {
      id: uid("off", `o${i}`),
      listingId: listing.id,
      buyerId: buyer.id,
      amount: { amountCents, currency: "USD" },
      status,
      threadId,
      parentOfferId: parent?.id ?? null,
      expiresAt: iso(daysAgo - 7),
      respondedAt: status === "PENDING" ? null : iso(daysAgo - 1),
      message: status === "PENDING" && !parent ? "Would you consider a serious offer?" : null,
      orderId: null,
      createdAt: iso(daysAgo),
      updatedAt: iso(daysAgo - 1),
    };
    offers.push(offer);
    return offer;
  };
  const acc1 = mkOffer(1, 3, "buyer", 620_000, "PENDING", 2);
  mkOffer(2, 5, "buyer2", 2_900_000, "PENDING", 1);
  mkOffer(3, 9, "buyer3", 260_000, "DECLINED", 9);
  const cnt4 = mkOffer(4, 14, "buyer", 800_000, "COUNTERED", 6);
  mkOffer(5, 14, "buyer", 835_000, "PENDING", 5, cnt4);
  mkOffer(6, 17, "buyer4", 230_000, "PENDING", 3);
  mkOffer(7, 20, "buyer2", 108_000, "PENDING", 4);

  // 7. Completed order #1 (happy path, with certificate, passport, review, payout)
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const inspections: Inspection[] = [];
  const certificates: Certificate[] = [];
  const passports: (typeof orders[number] & { passportId?: string })[] = [];
  const reviews: Review[] = [];
  const payouts: Payout[] = [];
  const notifications: Notification[] = [];
  const emails: EmailMessage[] = [];
  const auditEvents: AuditEventRow[] = [];

  function timeline(from: Order["status"] | null, to: Order["status"], note: string, daysAgo: number): OrderTimelineEvent {
    return { id: uid("evt", `t${to}${daysAgo}`), at: iso(daysAgo, 10), from, to, note, actorId: null };
  }

  const order1ListingIdx = 6; // Saxonia Thin
  const order1Listing = listings[order1ListingIdx] as Listing;
  order1Listing.status = "SOLD";
  const order1: Order = {
    id: uid("ord", "done"),
    listingId: order1Listing.id,
    buyerId: (userByKey.get("buyer2") as User).id,
    sellerId: order1Listing.sellerId,
    itemPrice: order1Listing.price,
    shippingCost: { amountCents: 7_500, currency: "USD" },
    insuranceCost: { amountCents: Math.round(order1Listing.price.amountCents / 100), currency: "USD" },
    total: {
      amountCents: order1Listing.price.amountCents + 7_500 + Math.round(order1Listing.price.amountCents / 100),
      currency: "USD",
    },
    currency: "USD",
    status: "PAYOUT_RELEASED",
    timeline: [
      timeline(null, "PENDING_PAYMENT", "Order created — Buy Now", 12),
      timeline("PENDING_PAYMENT", "PAYMENT_SECURED", "Payment confirmed by mock provider", 12),
      timeline("PAYMENT_SECURED", "SELLER_PREPARING", "Seller preparing dispatch", 11),
      timeline("SELLER_PREPARING", "SHIPPED_TO_AUTHENTICATOR", "Shipped to AURELIUS authentication center", 10),
      timeline("SHIPPED_TO_AUTHENTICATOR", "AUTHENTICATING", "Inspection started", 9),
      timeline("AUTHENTICATING", "AUTHENTICATED", "Authenticity confirmed", 8),
      timeline("AUTHENTICATED", "SHIPPED_TO_BUYER", "Shipped to buyer", 7),
      timeline("SHIPPED_TO_BUYER", "DELIVERED", "Delivered", 5),
      timeline("DELIVERED", "COMPLETED", "Buyer confirmed completion", 4),
      timeline("COMPLETED", "PAYOUT_RELEASED", "Mock escrow payout released", 3),
    ],
    shippingAddress: {
      fullName: "Lucius Felix",
      line1: "12 Via del Corso",
      line2: null,
      city: "Rome",
      postalCode: "00186",
      country: "Italy",
      phone: "+39 06 000 0000",
    },
    offerId: null,
    certificateId: null,
    passportId: null,
    checkoutIdempotencyKey: randomUUID(),
    trackingNumber: "AUR-TRK-0001",
    createdAt: iso(12),
    updatedAt: iso(3),
  };
  orders.push(order1);

  const pay1: Payment = {
    id: uid("pay", "p1"),
    orderId: order1.id,
    provider: "mock",
    providerRef: "mock_pi_seed01",
    amount: order1.total,
    status: "SUCCEEDED",
    idempotencyKey: randomUUID(),
    refunds: [],
    failureReason: null,
    createdAt: iso(12),
    updatedAt: iso(12),
  };
  payments.push(pay1);

  const insp1: Inspection = {
    id: uid("cert", "i1"),
    orderId: order1.id,
    listingId: order1.listingId,
    assignedTo: (userByKey.get("authenticator") as User).id,
    status: "APPROVED",
    outcomeNotes: "Movement original, serial matches house records, timekeeping +2s/day. Authentic.",
    checklist: { movement: true, authenticity: true, condition: true, timekeeping: true },
    completedAt: iso(8, 11),
    createdAt: iso(10),
    updatedAt: iso(8, 11),
  };
  inspections.push(insp1);

  const cert1: Certificate = {
    id: uid("cert", "c1"),
    certificateNumber: "AUR-2025-000001",
    listingId: order1.listingId,
    orderId: order1.id,
    issuedBy: (userByKey.get("authenticator") as User).id,
    result: "AUTHENTICATED",
    serialMasked: maskSerial(order1Listing.serialNumber),
    notes: "Verified against house records, movement, dial, and case geometry.",
    issuedAt: iso(8, 11),
    createdAt: iso(8, 11),
    updatedAt: iso(8, 11),
  };
  certificates.push(cert1);
  order1.certificateId = cert1.id;

  const passport1 = {
    id: uid("passport", "p1"),
    listingId: order1.listingId,
    orderId: order1.id,
    ownerId: order1.buyerId,
    serialMasked: maskSerial(order1Listing.serialNumber),
    certificateId: cert1.id,
    serviceHistory: [
      { at: iso(30), note: "Full service by house-approved watchmaker", by: "Seller record" },
    ],
    documents: [{ name: "Archive extract", path: `docs/${order1.id}/archive-extract` }],
    authenticationStatus: "CERTIFIED" as const,
    createdAt: iso(4),
    updatedAt: iso(4),
  };
  order1.passportId = passport1.id;

  const payout1: Payout = {
    id: uid("pay", "po1"),
    sellerId: order1.sellerId,
    orderId: order1.id,
    amount: { amountCents: Math.round(order1.total.amountCents * 0.95), currency: "USD" },
    status: "RELEASED",
    releasedAt: iso(3),
    createdAt: iso(4),
    updatedAt: iso(3),
  };
  payouts.push(payout1);

  const review1: Review = {
    id: uid("rev", "r1"),
    orderId: order1.id,
    listingId: order1.listingId,
    buyerId: order1.buyerId,
    sellerId: order1.sellerId,
    rating: 5,
    title: "Flawless from first click to final crown",
    body: "The watch arrived two days early, exactly as photographed. The authentication report was thorough and the passport arrived digitally the moment I confirmed. This is how it should always work.",
    status: "PUBLISHED",
    createdAt: iso(3),
    updatedAt: iso(3),
  };
  reviews.push(review1);

  // 8. In-flight order #2 (at authentication stage) — authenticator dashboard demo
  const order2ListingIdx = 15; // Big Arrow Chronograph
  const order2Listing = listings[order2ListingIdx] as Listing;
  order2Listing.status = "SOLD";
  const order2: Order = {
    id: uid("ord", "auth"),
    listingId: order2Listing.id,
    buyerId: (userByKey.get("buyer3") as User).id,
    sellerId: order2Listing.sellerId,
    itemPrice: order2Listing.price,
    shippingCost: { amountCents: 7_500, currency: "USD" },
    insuranceCost: { amountCents: Math.round(order2Listing.price.amountCents / 100), currency: "USD" },
    total: {
      amountCents: order2Listing.price.amountCents + 7_500 + Math.round(order2Listing.price.amountCents / 100),
      currency: "USD",
    },
    currency: "USD",
    status: "SHIPPED_TO_AUTHENTICATOR",
    timeline: [
      timeline(null, "PENDING_PAYMENT", "Order created — accepted offer", 4),
      timeline("PENDING_PAYMENT", "PAYMENT_SECURED", "Payment confirmed by mock provider", 4),
      timeline("PAYMENT_SECURED", "SELLER_PREPARING", "Seller preparing dispatch", 3),
      timeline("SELLER_PREPARING", "SHIPPED_TO_AUTHENTICATOR", "Shipped to AURELIUS authentication center", 1),
    ],
    shippingAddress: {
      fullName: "Vibia Sabina",
      line1: "88 Bath Road",
      line2: null,
      city: "London",
      postalCode: "W6 8AA",
      country: "United Kingdom",
      phone: null,
    },
    offerId: null,
    certificateId: null,
    passportId: null,
    checkoutIdempotencyKey: randomUUID(),
    trackingNumber: null,
    createdAt: iso(4),
    updatedAt: iso(1),
  };
  orders.push(order2);
  const pay2: Payment = {
    id: uid("pay", "p2"),
    orderId: order2.id,
    provider: "mock",
    providerRef: "mock_pi_seed02",
    amount: order2.total,
    status: "SUCCEEDED",
    idempotencyKey: randomUUID(),
    refunds: [],
    failureReason: null,
    createdAt: iso(4),
    updatedAt: iso(4),
  };
  payments.push(pay2);
  const insp2: Inspection = {
    id: uid("cert", "i2"),
    orderId: order2.id,
    listingId: order2.listingId,
    assignedTo: null,
    status: "QUEUED",
    outcomeNotes: null,
    checklist: { movement: false, authenticity: false, condition: false, timekeeping: false },
    completedAt: null,
    createdAt: iso(1),
    updatedAt: iso(1),
  };
  inspections.push(insp2);
  // The accepted offer behind order2
  const offer8 = mkOffer(8, order2ListingIdx, "buyer3", order2Listing.price.amountCents - 15_000, "ACCEPTED", 4);
  offer8.orderId = order2.id;

  // 9. Cart, vault, notifications, emails, audit, articles
  const cartItems = [
    { id: uid("car", "c1"), userId: (userByKey.get("buyer") as User).id, listingId: (listings[4] as Listing).id, addedAt: iso(1), createdAt: iso(1), updatedAt: iso(1) },
    { id: uid("car", "c2"), userId: (userByKey.get("buyer") as User).id, listingId: (listings[13] as Listing).id, addedAt: iso(1), createdAt: iso(1), updatedAt: iso(1) },
  ];
  const vaultEntries = [
    { id: uid("vault", "v1"), userId: (userByKey.get("buyer") as User).id, listingId: (listings[1] as Listing).id, note: "Birthday fund", addedAt: iso(9), createdAt: iso(9), updatedAt: iso(9) },
    { id: uid("vault", "v2"), userId: (userByKey.get("buyer") as User).id, listingId: (listings[21] as Listing).id, note: null, addedAt: iso(5), createdAt: iso(5), updatedAt: iso(5) },
    { id: uid("vault", "v3"), userId: (userByKey.get("buyer2") as User).id, listingId: (listings[10] as Listing).id, note: null, addedAt: iso(7), createdAt: iso(7), updatedAt: iso(7) },
  ];

  const notif = (userId: string, type: Notification["type"], title: string, body: string, link: string, daysAgo: number, read = false): Notification => ({
    id: uid("notif", `n${type}${daysAgo}${read ? "r" : ""}${userId.slice(-4)}`),
    userId,
    type,
    title,
    body,
    link,
    readAt: read ? iso(daysAgo) : null,
    dedupeKey: `seed:${title}:${userId.slice(-4)}`,
    createdAt: iso(daysAgo),
    updatedAt: iso(daysAgo),
  });
  const sellerUser = userByKey.get("seller") as User;
  const buyerUser = userByKey.get("buyer") as User;
  const authUser = userByKey.get("authenticator") as User;
  const adminUser = userByKey.get("admin") as User;
  notifications.push(
    notif(sellerUser.id, "OFFER_RECEIVED", "New offer received", "An offer of $6,200 was made on “Ronde Solaire”.", "/seller/offers", 2),
    notif(buyerUser.id, "PRICE_DROP", "Price drop on a vaulted watch", "“Historiques Ultra-Fine 1955” dropped in price.", "/vault", 6),
    notif(buyerUser.id, "OFFER_COUNTERED", "Counter-offer received", "The seller countered on “Big Arrow Chronograph 1946”.", "/account/offers", 5),
    notif(authUser.id, "SYSTEM", "Inspection queued", "Order for Big Arrow Chronograph 1946 awaits inspection.", "/authenticator", 1),
    notif(adminUser.id, "ADMIN_ALERT", "New listings awaiting review", "2 listings are awaiting moderation.", "/admin/listings", 1, true),
  );
  emails.push(
    { id: uid("email", "e1"), at: iso(2), to: sellerUser.email, subject: "New offer on your listing", body: "A buyer made an offer on Ronde Solaire.", template: "offer_received", createdAt: iso(2), updatedAt: iso(2) },
    { id: uid("email", "e2"), at: iso(1), to: buyerUser.email, subject: "Password reset requested (demo)", body: "If you requested a reset, the token was NOT sent here in demo — check server logs for the dev-only token.", template: "password_reset", createdAt: iso(1), updatedAt: iso(1) },
  );
  auditEvents.push(
    { id: uid("aud", "a1"), at: iso(12), actorType: "user", actorId: adminUser.id, action: "listing.published", targetType: "listing", targetId: (listings[6] as Listing).id, meta: { note: "Approved by admin" }, createdAt: iso(12), updatedAt: iso(12) },
    { id: uid("aud", "a2"), at: iso(8), actorType: "user", actorId: authUser.id, action: "certificate.issued", targetType: "certificate", targetId: cert1.id, meta: { orderId: order1.id }, createdAt: iso(8), updatedAt: iso(8) },
  );

  const articleDefs: Array<Pick<Article, "title" | "slug" | "category" | "excerpt"> & { body: string; author: string; daysAgo: number }> = [
    {
      title: "How to Read a Vintage Dial (Without Being Fooled)",
      slug: "how-to-read-a-vintage-dial",
      category: "GUIDE",
      excerpt: "Patina, relume, and the difference between honest wear and expensive lies.",
      author: "Minerva Archives",
      daysAgo: 30,
      body: "A vintage dial is a document.\n\nFirst, look at the printing. Original pad printing sits on top of the lacquer with crisp edges; refinished dials print into the lacquer and the letters go soft. Second, understand patina: tritium ages to warm cream, radium to burnished tan. A dial that is uniformly 'aged' usually was — by a bucket.\n\nThird, service marks. A professional service touches hands and movement, not the dial. If the dial has been cleaned with anything wetter than a dry breath, walk away.\n\nFinally, remember that every photograph in this archive is a simulated demo image. The knowledge, however, is real.",
    },
    {
      title: "The Escrow Discipline: How a Serious Marketplace Should Treat Money",
      slug: "the-escrow-discipline",
      category: "COLLECTING",
      excerpt: "Why payment must be secured before a seller lifts a finger — and released only after both parties are satisfied.",
      author: "Minerva Archives",
      daysAgo: 22,
      body: "High-value trade runs on custody, not trust.\n\nThe sequence is simple: the buyer pays, the platform holds, the seller ships to authentication, the authenticator certifies, the watch ships, the buyer confirms, the payout releases.\n\nEvery step has a state, every state has a timestamp, and every transition is logged. AURELIUS implements this as a demo with a mock payment provider — no real money moves — but the discipline is the point.\n\nIf a platform cannot show you its order state machine, ask why.",
    },
    {
      title: "A Brief History of the Wrist Alarm",
      slug: "a-brief-history-of-the-wrist-alarm",
      category: "HISTORY",
      excerpt: "From hotel wake-up calls to the Memovox: how the wrist learned to speak.",
      author: "Minerva Archives",
      daysAgo: 15,
      body: "Before the alarm wristwatch, travelers hired a knock-up service or trusted the front desk.\n\nThe first wrist alarms of the 1920s moved a second hammer across a second gear train — a mechanical Rube Goldberg that somehow fit under a shirt cuff. By 1950 the Memovox had made the genre respectable, and by 1960 every serious house had one.\n\nCollect them for the gong: when the alarm rings through the caseback, the watch speaks with its own voice.",
    },
    {
      title: "Caring for a Mechanical Watch in Daily Wear",
      slug: "caring-for-a-mechanical-watch",
      category: "CARE",
      excerpt: "Five habits that keep a movement alive for the next owner.",
      author: "Minerva Archives",
      daysAgo: 8,
      body: "Wind it gently, same time each morning.\n\nKeep it away from magnets — speakers, laptop lids, magnetic clasps. Screw the crown before water, never wind it wet. Service every five to seven years, not when it stops.\n\nAnd rotate: a collection that sleeps is a collection that congeals. Wear the quiet ones too.",
    },
  ];
  const articles: Article[] = [];
  for (const [i, a] of articleDefs.entries()) {
    const hero = `photos/w${String(((i + 11) % 26) + 1).padStart(2, "0")}.jpg`;
    articles.push({
      id: uid("art", `a${i}`),
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      body: a.body,
      category: a.category,
      author: a.author,
      publishedAt: iso(a.daysAgo),
      heroImage: hero,
      createdAt: iso(a.daysAgo),
      updatedAt: iso(a.daysAgo),
    });
  }
  await store.writeCollection("articles", articles);

  // 10. Persist everything
  await store.writeCollection("users", users);
  await store.writeCollection("sessions", []);
  await store.writeCollection("reset-tokens", []);
  await store.writeCollection("roles", roles);
  await store.writeCollection("brands", brandRows);
  await store.writeCollection("listings", listings);
  await store.writeCollection("price-history", priceHistory);
  await store.writeCollection("offers", offers);
  await store.writeCollection("cart-items", cartItems);
  await store.writeCollection("vault-entries", vaultEntries);
  await store.writeCollection("orders", orders);
  await store.writeCollection("payments", payments);
  await store.writeCollection("payouts", payouts);
  await store.writeCollection("inspections", inspections);
  await store.writeCollection("certificates", certificates);
  await store.writeCollection("passports", [passport1]);
  await store.writeCollection("reviews", reviews);
  await store.writeCollection("notifications", notifications);
  await store.writeCollection("emails", emails);
  await store.writeCollection("audit-events", auditEvents);
  await store.writeCollection("uploaded-images", uploadedImages);

  const ms = Date.now() - t0;
  console.log(`Seed complete in ${ms}ms:`);
  console.log(`  brands=${brandRows.length} listings=${listings.length} users=${users.length}`);
  console.log(`  offers=${offers.length} orders=${orders.length} payments=${payments.length}`);
  console.log(`  certificates=${certificates.length} reviews=${reviews.length} articles=${articles.length}`);
  console.log(`  media=SVG (simulated demo imagery, generated locally)`);
  console.log("");
  console.log("Demo accounts (password documented in README):");
  console.log("  buyer@aurelius.local · seller@aurelius.local · authenticator@aurelius.local · admin@aurelius.local");
  console.log("  (all demo passwords are the same; see README — hashes only are stored)");
  console.log("");
  console.log("All inventory, prices and market data are SIMULATED demo data.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
