import { render, screen } from '@testing-library/react';
import SuccessBlock from '@/components/SuccessBlock';

describe('SuccessBlock', () => {
  it('renders the success message', () => {
    render(<SuccessBlock message="Widget created." />);
    expect(screen.getByText('Widget created.')).toBeTruthy();
  });

  it('renders nothing when the message is empty', () => {
    const { container } = render(<SuccessBlock message="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
