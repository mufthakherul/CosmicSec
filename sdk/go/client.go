package cosmicsec

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	BaseURL string
	HTTP    *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{BaseURL: baseURL, HTTP: &http.Client{}}
}

func (c *Client) Health() (map[string]any, error) {
	resp, err := c.HTTP.Get(c.BaseURL + "/health")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return decodeBody(resp.Body)
}

func (c *Client) CreateScan(payload map[string]any) (map[string]any, error) {
	b, _ := json.Marshal(payload)
	resp, err := c.HTTP.Post(c.BaseURL+"/api/scans", "application/json", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return decodeBody(resp.Body)
}

func decodeBody(body io.Reader) (map[string]any, error) {
	var out map[string]any
	if err := json.NewDecoder(body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return out, nil
}
