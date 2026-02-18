import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(30,64,175,0.12),transparent)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700">
                AI-Powered Contract Intelligence
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Benchmark Your Software Contracts with{" "}
                <span className="text-brand-500">Confidence</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                SoftwiseAI analyzes your software vendor contracts against
                industry benchmarks, compares pricing across peer organizations,
                and delivers actionable negotiation strategies — all in a
                professional Gartner-style report.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/benchmark" className="btn-primary text-base px-8 py-4">
                  Start Free Benchmark
                </Link>
                <a href="#how-it-works" className="btn-secondary text-base px-8 py-4">
                  How It Works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-gray-100 bg-gray-50/50 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-gray-400 mb-6">
              Benchmark against leading software vendors
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-gray-400">
              {[
                "Microsoft",
                "Salesforce",
                "SAP",
                "Oracle",
                "ServiceNow",
                "Workday",
                "Adobe",
                "IBM",
              ].map((name) => (
                <span
                  key={name}
                  className="text-sm font-semibold tracking-wide"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Three simple steps to a comprehensive benchmarking report
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Select Vendor & Industry",
                  description:
                    "Choose your software vendor and industry. Our AI instantly researches vendor pricing strategies, common discounts, and negotiation leverage points.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z"
                    />
                  ),
                },
                {
                  step: "2",
                  title: "Upload Contract or Describe Deal",
                  description:
                    "Drop your contract details or describe the proposal. Our AI analyzes terms, pricing, SLAs, and compliance requirements against market standards.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  ),
                },
                {
                  step: "3",
                  title: "Get Your Report",
                  description:
                    "Receive a professional 3-page Gartner-style report with peer comparisons, pricing benchmarks, compliance gaps, and 7 actionable negotiation steps.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  ),
                },
              ].map((item) => (
                <div key={item.step} className="card text-center group hover:shadow-md transition-shadow">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <svg
                      className="h-7 w-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                What You Get
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                A comprehensive Gartner-style benchmarking report
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Peer Comparison",
                  desc: "Compare your deal against 10 similar organizations in your industry",
                },
                {
                  title: "Pricing Benchmark",
                  desc: "See how your pricing stacks up against market rates and volume discounts",
                },
                {
                  title: "Compliance Check",
                  desc: "Identify redress and compliance gaps in your vendor agreement",
                },
                {
                  title: "Risk Assessment",
                  desc: "Evaluate vendor lock-in risks, SLA adequacy, and exit clauses",
                },
                {
                  title: "7 Negotiation Steps",
                  desc: "Get specific, actionable steps to negotiate better terms immediately",
                },
                {
                  title: "PDF Report",
                  desc: "Download a professional 3-page report ready for stakeholder presentations",
                },
              ].map((feature) => (
                <div key={feature.title} className="card">
                  <h3 className="font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-brand-700 px-8 py-16 text-center shadow-xl sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Stop Overpaying for Software
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-200">
                Join thousands of procurement professionals using AI to
                benchmark and negotiate better software deals.
              </p>
              <Link
                href="/benchmark"
                className="mt-8 inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-brand-700 shadow-sm transition-all hover:bg-brand-50"
              >
                Start Your Free Benchmark
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
