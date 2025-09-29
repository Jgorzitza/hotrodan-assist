// GraphQL context types

export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  req: Request;
  res: Response;
}

export interface GraphQLRequest {
  headers: Record<string, string>;
  body: any;
  query: string;
  variables?: Record<string, any>;
}
