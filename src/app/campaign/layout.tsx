import CampaignAuthGuard from "./CampaignAuthGuard";

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  return <CampaignAuthGuard>{children}</CampaignAuthGuard>;
}
