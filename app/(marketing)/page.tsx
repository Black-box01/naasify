import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { PricingPreview } from "@/components/home/PricingPreview";
import { Features } from "@/components/home/Features";
import { FAQ } from "@/components/home/FAQ";
import { CTA } from "@/components/home/CTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActiveServices } from "@/lib/pricing";
import { SEO_DESCRIPTION, buildMetadata, faqJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Backend-as-a-Service Marketplace",
  description: SEO_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  const services = await getActiveServices();

  return (
    <>
      <Hero />
      <ServicesGrid services={services} />
      <PricingPreview />
      <Features />
      <FAQ />
      <CTA />
      {/* AEO: FAQ answers mirrored as structured data for rich results. */}
      <JsonLd data={faqJsonLd()} />
    </>
  );
}
