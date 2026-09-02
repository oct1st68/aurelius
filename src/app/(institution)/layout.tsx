import { InstHeader } from "@/components/institution/inst-header";
import { InstFooter } from "@/components/institution/inst-footer";

export const metadata = {
  title: "AURELIUS — Artifacts of time",
  description:
    "A private register of rare horological instruments. Authentication, provenance, and escrow-style custody — conducted with modern precision.",
};

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InstHeader />
      {children}
      <InstFooter />
    </>
  );
}
