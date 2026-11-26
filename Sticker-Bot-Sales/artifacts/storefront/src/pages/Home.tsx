import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Gift, MessageCircle, Palette, Printer, Scissors, Truck } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

const PHONE = "2348058162036";

export function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(245,158,11,.16),transparent_38%),radial-gradient(circle_at_10%_90%,rgba(37,99,235,.10),transparent_40%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:px-6 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
              <Palette className="h-4 w-4 text-primary" /> FREE, EASY LABEL DESIGN
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Your product label.
              <span className="block text-primary">Designed by you.</span>
              Printed by us.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Choose a ready-made design, add your business name, pick your colours and send us your preview. We help prepare it for printing, cut your stickers and arrange collection or delivery across Nigeria.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/generate">
                <Button size="lg" className="gap-2">Design my label <ArrowRight className="h-4 w-4"/></Button>
              </Link>
              <a href={whatsappUrl(PHONE, "Hello. Please tell me how your label design and printing service works.")} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline" className="gap-2"><MessageCircle className="h-4 w-4"/> Ask on WhatsApp</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No design experience needed · No design fee · Confirm your print price before production</p>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-4 shadow-xl">
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "Food & spices", name: "MAMA'S KITCHEN", product: "JOLLOF SPICE", bg: "#F7E7C6", fg: "#B83B25" },
                { title: "Beauty & skincare", name: "GLOW BY NENE", product: "BODY BUTTER", bg: "#F4DDE6", fg: "#7A3154" },
                { title: "Drinks", name: "FRESH SIP", product: "Z O B O", bg: "#F5E8C7", fg: "#7C3E24" },
                { title: "Honey & farm goods", name: "GOLDEN HARVEST", product: "PURE HONEY", bg: "#F8E7A8", fg: "#8B5A13" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl p-3" style={{background:item.bg}}>
                  <div className="flex aspect-square flex-col items-center justify-center rounded-full border-[5px] border-white/80 p-3 text-center" style={{color:item.fg}}>
                    <div className="text-[9px] font-black tracking-widest">{item.name}</div>
                    <div className="my-2 h-px w-2/3" style={{background:item.fg}}/>
                    <div className="text-lg font-black leading-tight">{item.product}</div>
                    <div className="mt-2 text-[8px] font-bold">MADE IN NIGERIA</div>
                  </div>
                  <div className="mt-2 text-center text-xs font-semibold" style={{color:item.fg}}>{item.title}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-muted/60 p-3 text-center text-xs text-muted-foreground">
              Example designs · Your business name and details go here
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Gift className="h-6 w-6"/></div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-primary">New customer welcome offer</div>
              <h2 className="mt-1 text-2xl font-extrabold">Get 10 stickers printed FREE</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Create your design at no cost. Once our team checks your first order, you may receive 10 sample stickers free. One offer per eligible business; material, size, collection and delivery conditions apply.</p>
            </div>
          </div>
          <Link href="/generate"><Button size="lg">Start designing <ArrowRight className="ml-2 h-4 w-4"/></Button></Link>
        </div>
      </section>

      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Simple steps</div>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">From your phone to your product.</h2>
            <p className="mt-3 text-sm text-muted-foreground">You handle the design. We help with the printing work.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Palette, title: "1. Choose a template", body: "Pick a label style that looks like your product." },
              { icon: CheckCircle2, title: "2. Add your details", body: "Type your brand and product name. Choose colours and size." },
              { icon: Printer, title: "3. Confirm your order", body: "We check the design, confirm the price and agree on production." },
              { icon: Scissors, title: "4. Print, cut and pack", body: "Sleekblue Media Houz handles production. We arrange collection or delivery." },
            ].map(({icon:Icon,title,body}) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5"/></div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Made for growing businesses</div>
            <h2 className="mt-2 text-3xl font-bold">No more last-minute label stress.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Order before your stickers finish. Keep your design details ready for the next print run. Ask us about urgent jobs, bulk quantities and scheduled reorders.</p>
            <div className="mt-5 space-y-3 text-sm">
              {["Small trial requests from 20 or 50 pieces, where feasible","Standard business orders from 100 pieces","Bulk quantities: 1,000, 2,000, 5,000 and above","Pickup and nationwide delivery options","Help with Meta advertising for eligible printing customers"].map((s) => <div key={s} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><span>{s}</span></div>)}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-3"><Truck className="h-6 w-6 text-primary"/><h3 className="text-xl font-bold">Clear prices. Clear next steps.</h3></div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Sticker prices depend on the size, shape, material, finish, quantity and cutting method. We will publish the approved price list once production costs are confirmed with our printing partner. You will always receive a quote before you pay.</p>
            <div className="mt-5 rounded-xl bg-muted/60 p-4">
              <div className="text-sm font-bold">Need a large quantity?</div>
              <p className="mt-1 text-xs text-muted-foreground">Tell us how many pieces you need and when you need them. We will confirm the best available production option.</p>
            </div>
            <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href={whatsappUrl(PHONE, "Hello. I need a sticker printing quote. Please help me.")} target="_blank" rel="noreferrer">Request a printing quote <ArrowRight className="h-4 w-4"/></a>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:px-6 md:py-20">
          <h2 className="text-3xl font-extrabold md:text-5xl">Let's make your product look ready for the shelf.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 opacity-85">Start with a free design. Send us your preview. We'll guide you through the printing and delivery.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/generate"><Button size="lg" variant="secondary">Design my label</Button></Link>
            <a href={whatsappUrl(PHONE, "Hello. I want to print product labels with you.")} target="_blank" rel="noreferrer"><Button size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"><MessageCircle className="mr-2 h-4 w-4"/> WhatsApp us</Button></a>
          </div>
          <p className="mt-5 text-xs opacity-70">Production partner: Sleekblue Media Houz · WhatsApp +234 805 816 2036</p>
        </div>
      </section>
    </main>
  );
}
