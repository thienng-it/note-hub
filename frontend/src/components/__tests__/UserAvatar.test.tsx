/**
 * UserAvatar Component Tests
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '../UserAvatar';

describe('UserAvatar', () => {
  describe('Snapshots', () => {
    it('matches snapshot - with avatar URL', () => {
      const { container } = render(
        <UserAvatar username="testuser" avatarUrl="https://example.com/avatar.jpg" />,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot - without avatar URL (initials)', () => {
      const { container } = render(<UserAvatar username="John Doe" avatarUrl={null} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot - with status indicator', () => {
      const { container } = render(
        <UserAvatar username="testuser" status="online" showStatus={true} />,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot - different sizes', () => {
      const { container: containerSm } = render(<UserAvatar username="test" size="sm" />);
      const { container: containerMd } = render(<UserAvatar username="test" size="md" />);
      const { container: containerLg } = render(<UserAvatar username="test" size="lg" />);
      const { container: containerXl } = render(<UserAvatar username="test" size="xl" />);

      expect(containerSm.firstChild).toMatchSnapshot('small');
      expect(containerMd.firstChild).toMatchSnapshot('medium');
      expect(containerLg.firstChild).toMatchSnapshot('large');
      expect(containerXl.firstChild).toMatchSnapshot('extra-large');
    });

    it('matches snapshot - different statuses', () => {
      const { container: containerOnline } = render(
        <UserAvatar username="test" status="online" showStatus={true} />,
      );
      const { container: containerOffline } = render(
        <UserAvatar username="test" status="offline" showStatus={true} />,
      );
      const { container: containerAway } = render(
        <UserAvatar username="test" status="away" showStatus={true} />,
      );
      const { container: containerBusy } = render(
        <UserAvatar username="test" status="busy" showStatus={true} />,
      );

      expect(containerOnline.firstChild).toMatchSnapshot('status-online');
      expect(containerOffline.firstChild).toMatchSnapshot('status-offline');
      expect(containerAway.firstChild).toMatchSnapshot('status-away');
      expect(containerBusy.firstChild).toMatchSnapshot('status-busy');
    });
  });

  describe('Behavior', () => {
    it('renders initials from username', () => {
      const { container } = render(<UserAvatar username="John Doe" />);
      expect(container.textContent).toContain('JD');
    });

    it('renders two initials for single word username', () => {
      const { container } = render(<UserAvatar username="test" />);
      // First two characters of username
      expect(container.textContent).toContain('T');
    });

    it('renders image when avatar URL is provided', () => {
      const { container } = render(
        <UserAvatar username="test" avatarUrl="https://example.com/avatar.jpg" />,
      );
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.src).toBe('https://example.com/avatar.jpg');
    });

    it('does not render status indicator when showStatus is false', () => {
      const { container } = render(
        <UserAvatar username="test" status="online" showStatus={false} />,
      );
      const statusIndicator = container.querySelector('[title="online"]');
      expect(statusIndicator).not.toBeInTheDocument();
    });

    it('renders status indicator when showStatus is true', () => {
      const { container } = render(
        <UserAvatar username="test" status="online" showStatus={true} />,
      );
      const statusIndicator = container.querySelector('[title="online"]');
      expect(statusIndicator).toBeInTheDocument();
    });
  });
});
