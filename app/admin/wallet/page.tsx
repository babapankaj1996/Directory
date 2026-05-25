import type { Metadata } from "next";
import { AdminWalletManager } from "@/components/admin/admin-wallet-manager";

export const metadata: Metadata = {
  title: "Admin Wallet"
};

export default function AdminWalletPage() {
  return <AdminWalletManager />;
}
