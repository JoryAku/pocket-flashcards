import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./review.css";

export async function generateMetadata():Promise<Metadata>{
  const h=await headers();
  const host=h.get("x-forwarded-host")||h.get("host")||"localhost:3001";
  const protocol=h.get("x-forwarded-proto")||(host.startsWith("localhost")?"http":"https");
  const origin=`${protocol}://${host}`;
  return {metadataBase:new URL(origin),title:"Pocket Flashcards — Review. Rinse. Repeat.",description:"Create study sets, practise terms, and track your progress.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"},openGraph:{title:"Pocket Flashcards",description:"Review. Rinse. Repeat."},twitter:{card:"summary",title:"Pocket Flashcards",description:"Review. Rinse. Repeat."}};
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
