import { describe, expect, it, vi } from "vitest";
import { aiResetFields } from "@/lib/candidate-save";
import { bootstrapAdminUsing, createUserWithRoleUsing } from "@/lib/accounts.logic";

function fakeAdmin(opts: { roleErr?: boolean; adminCount?: number; lockTaken?: boolean } = {}) {
  const deleteUser = vi.fn(async () => ({}));
  const admin = {
    auth: { admin: { createUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })), deleteUser } },
    from: (t: string) => ({
      insert: async () => ({
        error: (t === "user_roles" && opts.roleErr) || (t === "bootstrap_lock" && opts.lockTaken) ? { message: "fail" } : null,
      }),
      select: () => ({ eq: async () => ({ count: opts.adminCount ?? 0 }) }),
      delete: () => ({ eq: async () => ({}) }),
    }),
  };
  return { admin, deleteUser };
}
const input = { email: "a@b.test", password: "x".repeat(10), full_name: "A", company_name: "" };

describe("account creation", () => {
  it("deletes the auth user if the role insert fails", async () => {
    const { admin, deleteUser } = fakeAdmin({ roleErr: true });
    await expect(createUserWithRoleUsing(admin, { ...input, role: "customer" })).rejects.toThrow();
    expect(deleteUser).toHaveBeenCalledWith("u1");
  });
  it("refuses bootstrap when an admin exists", async () => {
    const { admin } = fakeAdmin({ adminCount: 1 });
    await expect(bootstrapAdminUsing(admin, input)).rejects.toThrow("An admin already exists");
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("refuses bootstrap when another request already holds the lock", async () => {
    const { admin } = fakeAdmin({ lockTaken: true });
    await expect(bootstrapAdminUsing(admin, input)).rejects.toThrow();
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });
});

describe("aiResetFields", () => {
  it("clears AI fields when job changes", () => {
    expect(aiResetFields({ cv_text: "a", job_id: "j1" }, { cv_text: "a", job_id: "j2" })).toEqual({
      ai_score: null, ai_summary: null, ai_evaluated_at: null,
    });
  });
  it("keeps AI fields when CV and job are unchanged", () => {
    expect(aiResetFields({ cv_text: "a", job_id: "j1" }, { cv_text: "a", job_id: "j1" })).toEqual({});
  });
});
