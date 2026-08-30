import ThresholdApp from '../../../components/threshold-app';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ThresholdApp view="activity" id={(await params).id}/>}
