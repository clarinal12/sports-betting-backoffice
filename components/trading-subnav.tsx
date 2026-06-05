'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ui } from '@/lib/ui';

export function TradingSubnav() {
  const pathname = usePathname();
  const items = [
    { href: '/trading/exposure', label: 'Exposure' },
    { href: '/trading/markets', label: 'Markets' },
    { href: '/trading/limits', label: 'Limits' },
  ];

  return (
    <nav className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            pathname === item.href ? ui.navLinkActive : ui.navLink
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
