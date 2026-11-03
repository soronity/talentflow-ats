import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/board" });
  },
  head: () => ({
    meta: [
      { title: "TalentFlow — mini ATS" },
      { name: "description", content: "Track candidates for your open jobs on a simple kanban board." },
      { property: "og:title", content: "TalentFlow — mini ATS" },
      { property: "og:description", content: "Track candidates for your open jobs on a simple kanban board." },
    ],
  }),
});
