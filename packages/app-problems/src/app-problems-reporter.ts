import { Client } from "urql";

import {
  AppProblemCreateDocument,
  AppProblemCreateInput,
  AppProblemDismissByKeyDocument,
} from "../generated/graphql";

export class AppProblemsReporter {
  constructor(private client: Client) {}

  async reportProblem(input: AppProblemCreateInput) {
    const { data, error } = await this.client
      .mutation(AppProblemCreateDocument, { input })
      .toPromise();

    if (error) {
      throw error;
    }

    if (data?.appProblemCreate?.errors.length) {
      throw new Error(data.appProblemCreate.errors[0].message ?? "Unknown error");
    }
  }

  async clearProblems(keys: string[]) {
    const { data, error } = await this.client
      .mutation(AppProblemDismissByKeyDocument, { keys })
      .toPromise();

    if (error) {
      throw error;
    }

    if (data?.appProblemDismiss?.errors.length) {
      throw new Error(data.appProblemDismiss.errors[0].message ?? "Unknown error");
    }
  }
}
