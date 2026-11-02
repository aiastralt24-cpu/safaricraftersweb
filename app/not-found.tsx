import {MissingPage} from '@/components/MissingPage';
import {readErrorMessage} from '@/lib/cms/error-settings';
export default async function NotFound(){return <MissingPage message={await readErrorMessage('notFound')}/>;}
