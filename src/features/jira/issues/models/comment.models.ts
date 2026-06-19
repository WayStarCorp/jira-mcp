/**
 * JIRA comment models
 */

import type {
  ADFDocument,
  ADFNode,
} from "@features/jira/shared/parsers/adf.parser";

/**
 * Comment author information
 */
export interface CommentAuthor {
  accountId: string;
  displayName: string | null;
  active?: boolean;
  accountType?: string;
  avatarUrls?: Record<string, string>;
  emailAddress?: string;
  timeZone?: string;
  self?: string;
}

/**
 * Comment information
 */
export interface Comment {
  id: string;
  body?: string | ADFDocument | ADFNode | null;
  author: CommentAuthor;
  created: string;
  updated: string;
  jsdPublic?: boolean;
  visibility?: {
    type: string;
    value: string;
  };
  updateAuthor?: CommentAuthor;
  self?: string;
}

/**
 * Paginated comments response from Jira REST API
 */
export interface IssueCommentsPage {
  comments: Comment[];
  total: number;
}

/**
 * Options for retrieving comments
 */
export interface GetCommentsOptions {
  issueKey: string;
  startAt?: number;
  maxResults?: number;
  orderBy?: string;
  expand?: string[];
}
