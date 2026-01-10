import { HtmlCleaner } from './html-cleaner';

describe('HtmlCleaner', () => {
  describe('clean', () => {
    it('should remove script tags', () => {
      const html = '<html><head><script>console.log("test");</script></head><body>Content</body></html>';
      const cleaned = HtmlCleaner.clean(html);
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('console.log');
    });

    it('should remove style tags', () => {
      const html = '<html><head><style>.test { color: red; }</style></head><body>Content</body></html>';
      const cleaned = HtmlCleaner.clean(html);
      expect(cleaned).not.toContain('<style>');
      expect(cleaned).not.toContain('color: red');
    });

    it('should remove HTML comments', () => {
      const html = '<html><!-- This is a comment --><body>Content</body></html>';
      const cleaned = HtmlCleaner.clean(html);
      expect(cleaned).not.toContain('<!--');
      expect(cleaned).not.toContain('-->');
    });

    it('should remove header, footer, nav, aside tags', () => {
      const html = '<html><header>Header</header><nav>Nav</nav><body>Content</body><footer>Footer</footer></html>';
      const cleaned = HtmlCleaner.clean(html);
      expect(cleaned).not.toContain('<header>');
      expect(cleaned).not.toContain('<footer>');
      expect(cleaned).not.toContain('<nav>');
    });

    it('should compress whitespace', () => {
      const html = '<html>   <body>   Content   with   spaces   </body>   </html>';
      const cleaned = HtmlCleaner.clean(html);
      expect(cleaned).not.toContain('   ');
    });

    it('should keep relevant classes', () => {
      const html = '<div class="event-title">Event</div><div class="irrelevant-class">Other</div>';
      const cleaned = HtmlCleaner.clean(html);
      expect(cleaned).toContain('event-title');
    });
  });

  describe('extractMainContent', () => {
    it('should extract main content', () => {
      const html = '<html><body><main><div>Main Content</div></main><footer>Footer</footer></body></html>';
      const cleaned = HtmlCleaner.extractMainContent(html);
      expect(cleaned).toContain('Main Content');
      expect(cleaned).not.toContain('Footer');
    });

    it('should extract article content', () => {
      const html = '<html><body><article><div>Article Content</div></article></body></html>';
      const cleaned = HtmlCleaner.extractMainContent(html);
      expect(cleaned).toContain('Article Content');
    });

    it('should fallback to full HTML if no main/article found', () => {
      const html = '<html><body><div>Content</div></body></html>';
      const cleaned = HtmlCleaner.extractMainContent(html);
      expect(cleaned).toContain('Content');
    });
  });
});
