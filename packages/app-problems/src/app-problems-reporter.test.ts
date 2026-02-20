import { Client, CombinedError } from "urql";
import { describe, expect, it, vi } from "vitest";

import { AppProblemCreateDocument, AppProblemDismissByKeyDocument } from "../generated/graphql";
import { AppProblemsReporter } from "./app-problems-reporter";

function createMockClient(mutation: ReturnType<typeof vi.fn>): Client {
  return { mutation: mutation as unknown as Client["mutation"] } as Client;
}

function mockMutationResponse(mutation: ReturnType<typeof vi.fn>, data: unknown) {
  mutation.mockReturnValueOnce({
    toPromise: async () => ({ data, error: undefined }),
  });
}

function mockMutationError(mutation: ReturnType<typeof vi.fn>, error: CombinedError) {
  mutation.mockReturnValueOnce({
    toPromise: async () => ({ data: undefined, error }),
  });
}

describe("AppProblemsReporter", () => {
  describe("reportProblem", () => {
    it("calls AppProblemCreate mutation with provided input", async () => {
      const mutation = vi.fn();

      mockMutationResponse(mutation, { appProblemCreate: { errors: [] } });

      const reporter = new AppProblemsReporter(createMockClient(mutation));

      await reporter.reportProblem({ key: "tax-error", message: "Tax service unavailable" });

      expect(mutation).toHaveBeenCalledWith(AppProblemCreateDocument, {
        input: { key: "tax-error", message: "Tax service unavailable" },
      });
    });

    it("throws when mutation returns GraphQL errors", async () => {
      const mutation = vi.fn();

      mockMutationResponse(mutation, {
        appProblemCreate: {
          errors: [{ message: "Invalid key", code: "INVALID", field: "key" }],
        },
      });

      const reporter = new AppProblemsReporter(createMockClient(mutation));

      await expect(reporter.reportProblem({ key: "x", message: "test" })).rejects.toThrow(
        "Invalid key",
      );
    });

    it("throws when mutation returns transport error", async () => {
      const mutation = vi.fn();
      const error = new CombinedError({ networkError: new Error("Network failure") });

      mockMutationError(mutation, error);

      const reporter = new AppProblemsReporter(createMockClient(mutation));

      await expect(reporter.reportProblem({ key: "test", message: "test" })).rejects.toBe(error);
    });
  });

  describe("clearProblems", () => {
    it("calls AppProblemDismissByKey mutation with provided keys", async () => {
      const mutation = vi.fn();

      mockMutationResponse(mutation, { appProblemDismiss: { errors: [] } });

      const reporter = new AppProblemsReporter(createMockClient(mutation));

      await reporter.clearProblems(["tax-error", "payment-error"]);

      expect(mutation).toHaveBeenCalledWith(AppProblemDismissByKeyDocument, {
        keys: ["tax-error", "payment-error"],
      });
    });

    it("throws when mutation returns GraphQL errors", async () => {
      const mutation = vi.fn();

      mockMutationResponse(mutation, {
        appProblemDismiss: {
          errors: [{ message: "Not found", code: "NOT_FOUND", field: null }],
        },
      });

      const reporter = new AppProblemsReporter(createMockClient(mutation));

      await expect(reporter.clearProblems(["unknown-key"])).rejects.toThrow("Not found");
    });

    it("throws when mutation returns transport error", async () => {
      const mutation = vi.fn();
      const error = new CombinedError({ networkError: new Error("Network failure") });

      mockMutationError(mutation, error);

      const reporter = new AppProblemsReporter(createMockClient(mutation));

      await expect(reporter.clearProblems(["test"])).rejects.toBe(error);
    });
  });
});
