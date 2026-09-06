import ThresholdApp from '../../../components/threshold-app';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ThresholdApp view="template" id={id}/>}
