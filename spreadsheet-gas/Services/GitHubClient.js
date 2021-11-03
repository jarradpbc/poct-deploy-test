// This script is grabbed from https://gist.github.com/mvl/356be3063026dce6c44d457227b8e167#file-githubclient-gs-L16
// and has been modified minimally
/*
 * GitHub Commits for Google App Script.
 * Originally derived from https://gist.github.com/pamelafox/ea0474daa137f035b489bf78cc5797ea
 * but now heavily modified.
 * Provides functionality for much of the GitHub 'Git database' API:
 * https://docs.github.com/en/rest/reference/git
 *
 * This allows some basic query and commit operations on a repository in GitHub without
 * requiring a local git client. The functionality is currently limited to getting available
 * branches, and the building blocks for constructing a commit. Since this is done via REST
 * calls, it requires a few more steps than when using the command line or a gui git client.
 *
 * Basic usage steps:
 * 1) Init a GitHub object with the config object
 * 2) Set the branch. Currently this must exist in the repo and is enforced by a check.
 * 3) Construct a tree to commit using BuildTree()
 * 4) Call Commit() with the resulting tree and an email address
 * 5) Profit
 */

function GitHub (config) { // eslint-disable-line 
    const owner = config.owner;
    const repo = config.repo;
    const username = config.username;
    const token = config.token;
    //let branch = 'develop'; // default ?
    let branch = config.branch;
  
    return {
      BuildTree,
      Commit,
      SetBranch,
      GetBranches
    };
  
    /**
     * SetBranch
     * Sets the branch for the commit
     * @param {string} branchname - The name of an existing branch
     * @returns {boolean} true if the branch exists, false if not
     */
    function SetBranch (branchname) {
      const branches = GetBranches();
      const branchIsValid = branches.includes(branchname);
      branch = branchname;
      return branchIsValid === true;
    }
  
    /**
     * GetBranches
     * Fetches list of branch names in the given repository, based on the config
     * passed into GitHub() when created.
     * See https://docs.github.com/en/rest/reference/repos#list-branches
     *
     * @returns {array} A list of existing branches
     */
    function GetBranches () {
      const GITHUB_URL = `https://api.github.com/repos/${owner}/${repo}/branches`;
      const headers = {
        Authorization: 'Basic ' + Utilities.base64Encode(username + ':' + token)
      };
      const options = { headers: headers, method: 'get' };
      const response = UrlFetchApp.fetch(GITHUB_URL, options);
      CheckHTTPResponse(response, 'get');
      const r = JSON.parse(response);
      const branches = r.map(val => val.name);
      return branches;
    }
  
    /**
     * Commit
     * Commits content to a Github repo.
     * https://docs.github.com/en/rest/reference/git
     *
     * @param {array} tree - Contents to commit. Use BuildTree, see docs.
     * @parame {string} name - Your name, or something
     * @param {string} email - Committer email
     * @returns {string} URL of new commit
     */
    function Commit (tree, name, email) {
      const lastCommitSha = GetHeadForBranch(branch);
      const lastTreeSha = GetTreeForCommit(lastCommitSha);
      const newContentTreeSha = StageTree(lastTreeSha, tree);
      const committer = { name: name, email: email };
      const newCommit = CreateCommit(lastCommitSha, newContentTreeSha, committer);
      const newCommitSha = newCommit.sha;
      UpdateBranchRef(newCommitSha);
  
      return newCommit.html_url;
    }
  
    /**
     * UpdateBranchRef
     * Update branch to point to new commit
     * See https://docs.github.com/en/rest/reference/git#get-a-commit
     *
     * @param {string} newCommitSha
     */
    function UpdateBranchRef (newCommitSha) {
      const response = MakeGitRequest('patch', 'refs/heads/' + branch, { sha: newCommitSha });
      return response;
    }
  
    /**
     * GetHeadForBranch
     * Get the head of the branch.
     *
     * @param {string} branchname
     * @returns {string } SHA1 of the branch's head commit
     */
    function GetHeadForBranch (branchname) {
      const response = GetBranch(branchname);
      const lastCommitSha = response.object.sha;
      return lastCommitSha;
    }
  
    /**
     * GetBranch
     * Low-level call to get the branch head ref object
     * See https://docs.github.com/en/rest/reference/git#get-a-reference
     *
     *  @param {string} branchname - Name of an existing branch
     * @returns {HTTPResponse} The response containing the
     */
    function GetBranch (branchname) {
      const response = MakeGitRequest('get', 'refs/heads/' + branch);
      return response;
    }
  
    /**
     * GetTreeForCommit(commitSha)
     * Get the tree hash for the given commit
     * See http://developer.github.com/v3/git/commits/
     *
     * @param {string } commitSha
     * @returns {string } SHA1 of tree
     */
    function GetTreeForCommit (commitSha) {
      const response = GetCommit(commitSha);
      const lastTreeSha = response.tree.sha;
      return lastTreeSha;
    }
  
    /**
     * GetCommit
     * Low-level call to fetch a commit object from a given hash
     * https://docs.github.com/en/rest/reference/git#get-a-commit
     *
     * @param {string} commitSha
     * @returns {HTTPResponse} The response containing the commit
     */
    function GetCommit (commitSha) {
      const response = MakeGitRequest('get', 'commits/' + commitSha);
      return response;
    }
  
    /**
     * BuildTree
     * This thing is a simple factory for appending file objects to a tree for commiting
     *
     * @param {string} filename - the name of the file to commit
     * @param {string} content - the contents of the file aka blob. MUST BE A STRING!
     * @param {string} mode - the file mode. Defaults to regular file (see docs)
     * @param {array} tree - an existing array of these tree objects, or defaults to a new array.
     * @returns {array} - the 'tree' object, an array of objects
     */
    function BuildTree (filename, content, mode = '100644', tree = []) {
      const entry =
      {
        path: filename,
        content: content,
        mode: mode,
        type: 'blob' // TODO: Naively assumes a blob (see docs)
      };
      tree.push(entry);
      return tree;
    }
  
    /**
     * StageTree
     * See https://docs.github.com/en/rest/reference/git#create-a-tree
     *
     * @param {string} lastTreeSha - SHA1 of existing tree, used as the base
     * @param {array} tree - An array of objects specifying tree structure (see docs)
     *  Use BuildTree to construct the treeObjects
     * @returns {string} SHA1 of new tree
     */
    function StageTree (lastTreeSha, tree) {
      const response = MakeGitRequest('post', 'trees',
        {
          base_tree: lastTreeSha,
          tree: tree
        });
      return response.sha;
    }
  
    /**
     * CreateCommit
     * This finalizes a commit given a parent and a tree.
     * Also takes a committer as metadata
     * See https://docs.github.com/en/rest/reference/git#create-a-commit
     *
     * @param {string} lastCommitSha - the parent, as retrieved with GetHeadForBranch()
     * @param {string} newContentTreeSha - the tree, as returned from StageTree()
     * @param {object} committer - { name: (string), email: (string) }
     */
    function CreateCommit (lastCommitSha, newContentTreeSha, committer) {
      const date = new Date().toLocaleDateString('en-us');
      // TODO: Customize commit message (append or ?)
      const message = `Committing spreadsheet content on ${date}`;
      const response = MakeGitRequest('post', 'commits',
        {
          parents: [lastCommitSha],
          tree: newContentTreeSha,
          committer: committer,
          message: message
        });
      return response;
    }
  
    /**
     * MakeGitRequest
     * Makes authenticated HTTP request to Github's git database API.
     * See https://docs.github.com/en/rest/reference/git
     *
     * @param {string} method - HTTP method
     * @param {string} resource - resource path in the API
     * @param {object} data - body of the request, varies.
     * @returns {object} response - the HTTP response
     */
    function MakeGitRequest (method, resource, data) {
      const GITHUB_URL = `https://api.github.com/repos/${owner}/${repo}/git/${resource}`;
      const headers = { Authorization: 'Basic ' + Utilities.base64Encode(username + ':' + token) };
      const options = { headers: headers, method: method };
      if (data) {
        options.contentType = 'application/json'; // 'application/vnd.github.v3+json' ?
        options.payload = JSON.stringify(data);
      }
      const response = UrlFetchApp.fetch(GITHUB_URL, options);
      CheckHTTPResponse(response, method);
      return JSON.parse(response);
    }
  
    /**
     * CheckHTTPResponse
     * Utility for consolidating error logging on the API calls
     * Dummy up stub for error handling
     * See https://developers.google.com/apps-script/reference/url-fetch/http-response
     *
     * @param {HTTPResponse} response
     * @param {string} method - HTTP method, used to check status
     */
    function CheckHTTPResponse (response, method) {
      const successCode = GetExpectedStatusCode(method);
      const code = response.getResponseCode();
      if (code !== successCode) {
        Logger.log(
          `ERROR: Received response:\n${code}\n${response.getResponseText()}`
        );
      }
    }
  
    /**
     * GetExpectedStatusCode
     * Return an expected success code based on lookup by HTTP method.
     * Fragile, but works for this set of GitHub API calls.
     *
     * @param {string} method The HTTP method (get, post, etc)
     * @returns {Integer} statusCode
     */
    function GetExpectedStatusCode (method) {
      let statusCode = 200;
      switch (method) {
        case 'get':
          statusCode = 200;
          break;
        case 'post':
          statusCode = 201;
          break;
        case 'patch':
          statusCode = 200;
          break;
        default:
          statusCode = 200;
          break;
      }
      return statusCode;
    }
  }