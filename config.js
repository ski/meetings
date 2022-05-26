const env = "production";

//insert your API Key & Secret for each environment, keep this file local and never push it to a public repo for security purposes.
const config = {
  production: {
    APIKey:
      "HTKFlqrNQySEYdvzHj-A4A",
    APISecret: "3eHI88HxJiBiEUxeDdxama9GdhFNsM0G14eB",
    from: "2022-01-30",
    to: "2022-02-16",
    debug: true,
    bucketSize: 5,
    limit: 1,
    interval: 2000,
  },
};

export const Config = config[env];
