import { redirect } from 'next/navigation';

/** 예전 주소: 관리자 콘솔 중개사 탭으로 (관문은 /admin이 맡음) */
export default function AdminBrokersPage() {
  redirect('/admin?tab=brokers');
}
