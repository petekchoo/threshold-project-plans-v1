import ThresholdApp from '../../../components/threshold-app';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ThresholdApp view="project" id={(await params).id}/>}
