'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ui } from '@/lib/ui';

export function SettlementSubnav() {
  const pathname = usePathname();
  const items = [
    { href: '/settlement', label: 'Event queue' },
    { href: '/settlement/wallet-queue', label: 'Wallet transmission' },
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
