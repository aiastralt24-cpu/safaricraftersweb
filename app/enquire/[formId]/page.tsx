import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {PublicEnquiryForm} from '@/components/PublicEnquiryForm';
import './enquiry.css';
export const metadata:Metadata={title:'Send an enquiry',robots:{index:false,follow:false},alternates:{canonical:null}};
export default async function EnquiryPage({params}:{params:Promise<{formId:string}>}){
 const {formId}=await params;
 if(!z.string().uuid().safeParse(formId).success)notFound();
 return <div className='enquiry-page'><p className='enquiry-eyebrow'>Safari Crafters</p><h1>Let’s plan your journey.</h1><PublicEnquiryForm formId={formId}/></div>;
}
