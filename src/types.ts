export interface Payload {
  action: "completed";
  enterprise: object;
  installation: {
    id: number;
    account: GitHubUser;
    access_tokens_url: string;
    repositories_url: string;
    html_url: string;
    app_id: number;
    target_id: number;
    target_type: "Bot" | "User" | "Organization";
    permissions: {
      checks: string;
      metadata: string;
      contents: string;
    };
    events: string[];
    single_file_name: string;
    has_multiple_single_files: boolean;
    single_file_paths: string[];
    repository_selection: string;
    created_at: string;
    updated_at: string;
    app_slug: string;
    suspended_at: string | null;
    suspended_by: string | null;
  };
  organization: {
    id: number;
    login: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: GitHubUser;
    private: boolean;
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
    archive_url: string;
  };
  sender: string;
  workflow: {
    badge_url: string;
    created_at: string;
    html_url: string;
    id: number;
    name: string;
    node_id: string;
    path: string;
    state: string;
    updated_at: string;
    url: string;
  };
  workflow_run: {
    actor: GitHubUser;
    artifacts_url: string;
    cancel_url: string;
    check_suite_id: number;
    check_suite_node_id: string;
    check_suite_url: string;
    conclusion:
      | "action_required"
      | "cancelled"
      | "failure"
      | "neutral"
      | "skipped"
      | "stale"
      | "success"
      | "timed_out"
      | "startup_failure"
      | null;
    created_at: string;
    event: string;
    head_branch: string | null;
    head_commit: {
      author: object;
      committer: object;
      id: string;
      message: string;
      timestamp: string;
      tree_id: string;
    };
    head_repository: GitHubRepository;
    head_sha: string;
    html_url: string;
    id: number;
    jobs_url: string;
    logs_url: string;
    name: string | null;
    node_id: string;
    path: string;
    previous_attempt_url: string | null;
    pull_requests: object[];
    referenced_workflows: {
      path: string;
      ref: string;
      sha: string;
    };
    repository: GitHubRepository;
    rerun_url: string;
    run_attempt: number;
    run_number: number;
    run_started_at: string;
    status: "requested" | "in_progress" | "completed" | "queued" | "pending" | "waiting";
    triggering_actor: GitHubUser | null;
    updated_at: string;
    url: string;
    workflow_id: number;
    workflow_url: string;
    display_title: string;
  };
}

interface GitHubUser {
  avatar_url: string;
  deleted: boolean;
  email: string | null;
  events_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  gravatar_id: string;
  html_url: string;
  id: number;
  login: string;
  name: string;
  node_id: string;
  organizations_url: string;
  received_events_url: string;
  repos_url: string;
  site_admin: boolean;
  starred_url: string;
  subscriptions_url: string;
  type: "Bot" | "User" | "Organization";
  url: string;
  user_view_type: string;
}

interface GitHubRepository {
  archive_url: string;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  deployments_url: string;
  description: string | null;
  downloads_url: string;
  events_url: string;
  fork: boolean;
  forks_url: string;
  full_name: string;
  git_commits_url: string;
  git_refs_url: string;
  git_tags_url: string;
  hooks_url: string;
  html_url: string;
  id: number;
  issue_comment_url: string;
  issue_events_url: string;
  issues_url: string;
  keys_url: string;
  labels_url: string;
  languages_url: string;
  merges_url: string;
  milestones_url: string;
  name: string;
  node_id: string;
  notifications_url: string;
  owner: GitHubUser | null;
  private: boolean;
  pulls_url: string;
  releases_url: string;
  stargazers_url: string;
  statuses_url: string;
  subscribers_url: string;
  subscription_url: string;
  tags_url: string;
  teams_url: string;
  trees_url: string;
  url: string;
}

export interface Comment {
  id: number;
  node_id: string;
  body: string;
  url: string;
  html_url: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  issue_url: string;
  author_association: string;
}

export interface Artifact {
  id: number;
  node_id: string;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
  updated_at: string;
  digest: string;
  workflow_run: {
    id: number;
    repository_id: number;
    head_repository_id: number;
    head_branch: string;
    head_sha: string;
  };
}

export interface WorkflowRunArtifacts {
  total_count: number;
  artifacts: Artifact[];
}

export interface ArtifactData {
  packages: {
    name: string;
    url: string;
    shasum: string;
  }[];
  templates: unknown[];
  workflow: {
    pull_request?: {
      number: string;
    };
  };
}
