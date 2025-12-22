'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClientForm from '@/components/features/clients/ClientForm';

export default function NewClientPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Back Link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Client</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Enter the client's information to add them to your roster
        </p>
      </div>

      {/* Form */}
      <ClientForm
        onCancel={() => router.push('/clients')}
        onSuccess={() => router.push('/clients')}
      />
    </div>
  );
}
