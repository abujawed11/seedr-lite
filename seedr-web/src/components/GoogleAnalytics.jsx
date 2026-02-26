import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_ID = 'G-7JS45G2NRB';

export default function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('config', GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}
