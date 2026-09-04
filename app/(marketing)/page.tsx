import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { PricingPreview } from "@/components/home/PricingPreview";
import { Features } from "@/components/home/Features";
import { CTA } from "@/components/home/CTA";
import { getActiveServices } from "@/lib/pricing";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Backend-as-a-Service`,
  description: SITE_TAGLINE,
};

export default async function HomePage() {
  const services = await getActiveServices();

  return (
    <>
      <Hero />
      <ServicesGrid services={services} />
      <PricingPreview />
      <Features />
      <CTA />
    </>
  );
}
