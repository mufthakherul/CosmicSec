package cosmicsec

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Client is the CosmicSec API client.
type Client struct {
	BaseURL string
	HTTP    *http.Client
	token   string
	apiKey  string
}

// NewClient creates a new CosmicSec client with the given base URL.
func NewClient(baseURL string) *Client {
	return &Client{BaseURL: baseURL, HTTP: &http.Client{}}
}

// SetToken sets the Bearer token for authenticated requests.
func (c *Client) SetToken(token string) { c.token = token }

// SetAPIKey sets the API key for authenticated requests.
func (c *Client) SetAPIKey(apiKey string) { c.apiKey = apiKey }

// doRequest performs an HTTP request and returns the decoded response map.
// For GET requests pass body as nil.
func (c *Client) doRequest(method, path string, body map[string]any) (map[string]any, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := decodeBody(resp.Body)
	if err != nil {
		return nil, err
	}
	// Unwrap gateway envelope: if raw has a "data" key that is a map, return it.
	if data, ok := raw["data"]; ok {
		if m, ok := data.(map[string]any); ok {
			return m, nil
		}
	}
	return raw, nil
}

// doRequestList performs an HTTP request and returns the decoded response as a slice.
func (c *Client) doRequestList(method, path string, body map[string]any) ([]map[string]any, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out []map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		// Try as envelope with "data" array
		return nil, fmt.Errorf("decode list response: %w", err)
	}
	return out, nil
}

// Health returns the platform health status.
func (c *Client) Health() (map[string]any, error) {
	return c.doRequest("GET", "/health", nil)
}

// Login authenticates with email/password and stores the returned token.
func (c *Client) Login(email, password string) (map[string]any, error) {
	res, err := c.doRequest("POST", "/auth/login", map[string]any{
		"email":    email,
		"password": password,
	})
	if err != nil {
		return nil, err
	}
	if tok, ok := res["access_token"].(string); ok && tok != "" {
		c.SetToken(tok)
	}
	return res, nil
}

// CreateScan creates a new scan with the provided payload.
func (c *Client) CreateScan(payload map[string]any) (map[string]any, error) {
	return c.doRequest("POST", "/api/scans", payload)
}

// GetScans returns a list of scans, optionally filtered by params (e.g. {"status": "completed"}).
func (c *Client) GetScans(params map[string]string) ([]map[string]any, error) {
	path := "/api/scans"
	if len(params) > 0 {
		q := url.Values{}
		for k, v := range params {
			q.Set(k, v)
		}
		path += "?" + q.Encode()
	}
	return c.doRequestList("GET", path, nil)
}

// GetScan returns a single scan by ID.
func (c *Client) GetScan(id string) (map[string]any, error) {
	return c.doRequest("GET", "/api/scans/"+id, nil)
}

// GetScanFindings returns the findings for a specific scan.
func (c *Client) GetScanFindings(scanId string) ([]map[string]any, error) {
	return c.doRequestList("GET", "/api/scans/"+scanId+"/findings", nil)
}

// GetFindings returns findings filtered by optional params (e.g. {"severity": "critical"}).
func (c *Client) GetFindings(params map[string]string) ([]map[string]any, error) {
	path := "/api/findings"
	if len(params) > 0 {
		q := url.Values{}
		for k, v := range params {
			q.Set(k, v)
		}
		path += "?" + q.Encode()
	}
	return c.doRequestList("GET", path, nil)
}

// AnalyzeFindings sends findings to the AI analysis endpoint.
func (c *Client) AnalyzeFindings(target string, findings []map[string]any) (map[string]any, error) {
	return c.doRequest("POST", "/analyze", map[string]any{
		"target":   target,
		"findings": findings,
	})
}

// CorrelateFindings correlates a set of findings and returns a risk report.
func (c *Client) CorrelateFindings(findings []map[string]any) (map[string]any, error) {
	return c.doRequest("POST", "/correlate", map[string]any{"findings": findings})
}

// StartWorkflow starts an AI-driven recon/scan workflow for the given target.
func (c *Client) StartWorkflow(target string) (map[string]any, error) {
	return c.doRequest("POST", "/ai/workflow/start", map[string]any{"target": target})
}

// RegisterAgent registers a CLI agent with its manifest.
func (c *Client) RegisterAgent(agentId string, manifest map[string]any) (map[string]any, error) {
	return c.doRequest("POST", "/api/agents/register", map[string]any{
		"agent_id": agentId,
		"manifest": manifest,
	})
}

// GetAgents returns a list of registered agents.
func (c *Client) GetAgents() ([]map[string]any, error) {
	return c.doRequestList("GET", "/api/agents", nil)
}

// GenerateAPIKey creates a new named API key for the authenticated user.
func (c *Client) GenerateAPIKey(name string) (map[string]any, error) {
	return c.doRequest("POST", "/profile/api-keys", map[string]any{"name": name})
}

func decodeBody(body io.Reader) (map[string]any, error) {
	var out map[string]any
	if err := json.NewDecoder(body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return out, nil
}

