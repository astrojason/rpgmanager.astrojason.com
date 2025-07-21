# RPG Manager - Development TODOs

## 🎯 Next Features

### 1. Interactive Sidebar Details

- [ ] Update clickable area links to open a sidebar instead of navigation
- [ ] Create a right-side sliding panel component
- [ ] Display location details, images, and rich content in sidebar
- [ ] **Markdown Support**: Render markdown content in sidebar
  - [ ] Location descriptions with formatting, links, lists
  - [ ] Embedded images and media
  - [ ] Cross-references to other locations/NPCs/quests
- [ ] Add close/minimize functionality for sidebar
- [ ] Ensure sidebar is responsive on mobile devices

### 2. Navigation System

- [ ] Create collapsible left navigation panel
- [ ] Implement navigation categories:
  - [ ] **Locations** - Towns, cities, landmarks
  - [ ] **NPCs** - Characters, merchants, quest givers
  - [ ] **Quests** - Active, completed, available quests
  - [ ] **Items** - Weapons, armor, artifacts, consumables
  - [ ] **Lore** - History, stories, world building
- [ ] Add expand/collapse animation
- [ ] Make navigation responsive (overlay on mobile)
- [ ] Add icons for each navigation category

### 3. Authentication System

- [ ] Set up Firebase Authentication
- [ ] Create login/signup components
- [ ] Implement protected routes
- [ ] Add user session management
- [ ] Create user profile/settings page
- [ ] Add logout functionality
- [ ] Hide sensitive content behind authentication
- [ ] **Dynamic App Title**: Update title based on campaign and section
  - Format: `"{Campaign Name} - {Section}: RPG Campaign Manager"`
  - Examples:
    - `"Azorian's Bounty - Quests: RPG Campaign Manager"`
    - `"Azorian's Bounty - NPCs: RPG Campaign Manager"`
    - `"Storm King's Thunder - Locations: RPG Campaign Manager"`
  - Default: `"RPG Campaign Manager"` (when not logged in or no campaign selected)

### 4. User Notes System

- [ ] Create notes database schema (Firebase Firestore)
- [ ] Add "Add Note" button to locations/NPCs/quests
- [ ] **Markdown Note Editor**: Rich text editing with markdown support
  - [ ] Live preview mode
  - [ ] Syntax highlighting
  - [ ] Auto-linking to other campaign content
  - [ ] Image/file attachment support
- [ ] Display user's notes in sidebar/details (markdown rendered)
- [ ] Add note management (edit, delete, search)
- [ ] Make notes private to each user
- [ ] Add note categories/tags

## 🛠 Technical Improvements

### UI/UX Enhancements

- [ ] Add loading states for all components
- [ ] Implement error boundaries
- [ ] Add toast notifications for user actions
- [ ] Create consistent design system/theme
- [ ] Add dark mode toggle
- [ ] Improve mobile responsiveness

### Performance

- [ ] Add image optimization
- [ ] Implement lazy loading for content
- [ ] Add caching for Firebase data
- [ ] Optimize bundle size

### Admin Improvements

- [ ] Add bulk import for locations/NPCs
- [ ] **Markdown Content Management**:
  - [ ] Markdown editor for all content types
  - [ ] Preview mode for content creation
  - [ ] Template system for common content types
  - [ ] Bulk import from markdown files
- [ ] Create content management interface
- [ ] Add image upload functionality
- [ ] Implement version control for content changes

## 🏗 Future Features

### Advanced Functionality

- [ ] Search functionality across all content
- [ ] Favorites/bookmarks system
- [ ] Map layers (political, geographic, etc.)
- [ ] Timeline/calendar system
- [ ] Character relationship graphs
- [ ] Quest dependency tracking

### Social Features

- [ ] **Campaign Management** - Create/join multiple campaigns
- [ ] **Campaign Selection** - Switch between different worlds/campaigns
- [ ] Shared campaigns/groups
- [ ] Collaborative note-taking
- [ ] DM/Player role management
- [ ] Session planning tools

### Integration

- [ ] Export to PDF functionality
- [ ] **Obsidian Export**: Bulk export campaign data for Obsidian integration
  - [ ] Export all locations, NPCs, quests, items, lore as markdown files
  - [ ] Maintain proper file structure (folders by content type)
  - [ ] Generate Obsidian-compatible wikilinks between content
  - [ ] Include frontmatter with metadata (tags, dates, campaign info)
  - [ ] Export user notes as separate markdown files
  - [ ] Generate index files and MOCs (Maps of Content)
  - [ ] Preserve image references and file attachments
- [ ] Integration with VTT platforms
- [ ] API for external tools
- [ ] Backup/restore functionality

---

## 📝 Development Notes

### Current Architecture

- Next.js 15.4.2 with TypeScript
- Tailwind CSS v4 for styling
- Vercel deployment with GitHub Actions
- Interactive image component with admin panel

### Technology Stack for New Features

- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **State Management**: React Context or Zustand
- **UI Components**: Headless UI or Radix UI
- **Markdown Rendering**: React Markdown + Remark/Rehype plugins
- **Markdown Editor**: @uiw/react-md-editor or React Markdown Editor Lite
- **Icons**: Heroicons or Lucide React

### Development Priority

1. 🔥 Interactive sidebar (immediate UX improvement)
2. 🔥 Navigation system (content organization)
3. 🏗️ Campaign management (multi-campaign support)
4. 🔒 Authentication (content protection)
5. 📝 Notes system (user engagement)
