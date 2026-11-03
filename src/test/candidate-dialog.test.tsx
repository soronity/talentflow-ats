import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// In-memory fake of the candidates table; no network, no real data.
const calls = { insert: [] as any[], update: [] as any[] };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (row: any) => {
        calls.insert.push(row);
        return { select: () => ({ single: async () => ({ data: { id: `id-${calls.insert.length}` }, error: null }) }) };
      },
      update: (row: any) => {
        calls.update.push(row);
        return { eq: async () => ({ error: null }) };
      },
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));
vi.mock("@/lib/ats.functions", () => ({ evaluateCandidate: vi.fn() }));
vi.mock("@tanstack/react-start", async (orig) => ({
  ...(await orig<any>()),
  useServerFn: () => async () => ({ score: 70, summary: "Good" }),
}));

import { CandidateDialog } from "@/routes/_authenticated/board";

const jobs = [{ id: "j1", title: "Dev" }, { id: "j2", title: "Ops" }];
const props = { defaultJob: "j1", jobs, customerId: "c1", onClose: () => {}, onSaved: () => {} };

beforeEach(() => {
  calls.insert = [];
  calls.update = [];
});

function fillNew() {
  render(<CandidateDialog candidate={null} {...props} />);
  const inputs = screen.getAllByRole("textbox");
  fireEvent.change(inputs[0]!, { target: { value: "Ada" } }); // full name
  fireEvent.change(screen.getByPlaceholderText("Paste the CV content here"), { target: { value: "CV" } });
}

describe("CandidateDialog", () => {
  it("new candidate: Assess then Save inserts exactly once", async () => {
    fillNew();
    fireEvent.click(screen.getByText("Assess CV with AI"));
    await screen.findByText("Re-assess");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(calls.update.length).toBe(1));
    expect(calls.insert.length).toBe(1);
  });

  it("new candidate: Assess then Re-assess inserts exactly once", async () => {
    fillNew();
    fireEvent.click(screen.getByText("Assess CV with AI"));
    fireEvent.click(await screen.findByText("Re-assess"));
    await waitFor(() => expect(calls.update.length).toBe(1));
    expect(calls.insert.length).toBe(1);
  });

  it("editing the CV of a scored candidate clears the AI score on save", async () => {
    const cand = {
      id: "x", full_name: "Bo", email: null, phone: null, linkedin_url: null, notes: null,
      cv_text: "old", job_id: "j1", ai_score: 80, ai_summary: "s", ai_evaluated_at: "t",
    } as any;
    render(<CandidateDialog candidate={cand} {...props} />);
    fireEvent.change(screen.getByPlaceholderText("Paste the CV content here"), { target: { value: "new" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(calls.update.length).toBe(1));
    expect(calls.update[0]).toMatchObject({ ai_score: null, ai_summary: null, ai_evaluated_at: null });
  });
});
