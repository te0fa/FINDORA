import { redirect } from "next/navigation";

export default async function WorkspaceRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // The workspace is meant for specific requests. 
  // If a user navigates to /staff/workspace directly, redirect them to the hub.
  redirect(`/${locale}/staff/hub`);
}
