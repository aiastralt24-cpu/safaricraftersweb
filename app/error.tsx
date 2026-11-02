'use client';
import {ServerErrorPage} from '@/components/ServerErrorPage';
export default function ErrorPage({reset}:{reset:()=>void}){return <ServerErrorPage reset={reset}/>;}
