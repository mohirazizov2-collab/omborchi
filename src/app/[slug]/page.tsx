import { CompanyLogin } from "@/components/auth/company-login";

export default async function CompanyLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CompanyLogin slug={slug} />;
}
