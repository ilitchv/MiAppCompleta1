
import React from 'react';

interface ReferralNode {
    id: string;
    name: string;
    level: number;
    sales: number;
    children?: ReferralNode[];
}

const MOCK_TREE: ReferralNode = {
    id: 'root',
    name: 'You',
    level: 0,
    sales: 1540,
    children: [
        {
            id: 'l1-1', name: 'Marco P.', level: 1, sales: 450, children: [
                { id: 'l2-1', name: 'Juan D.', level: 2, sales: 120, children: [
                    { id: 'l3-1', name: 'Ana S.', level: 3, sales: 50 }
                ]},
                { id: 'l2-2', name: 'Luis F.', level: 2, sales: 200, children: [] }
            ]
        },
        {
            id: 'l1-2', name: 'Sarah J.', level: 1, sales: 890, children: [
                { id: 'l2-3', name: 'Mike T.', level: 2, sales: 300, children: [] }
            ]
        },
        {
            id: 'l1-3', name: 'David B.', level: 1, sales: 0, children: [] }
    ]
};

const TreeNode: React.FC<{ node: ReferralNode }> = ({ node }) => {
    const hasChildren = node.children && node.children.length > 0;
    
    // Color coding by level
    const colors = [
        'border-neon-cyan bg-neon-cyan/20 text-white', // You
        'border-blue-500 bg-blue-500/10 text-blue-200', // L1
        'border-purple-500 bg-purple-500/10 text-purple-200', // L2
        'border-pink-500 bg-pink-500/10 text-pink-200', // L3
    ];

    const cardClass = `
        flex flex-col items-center p-3 rounded-xl border-2 shadow-lg transition-transform hover:scale-105
        ${colors[node.level] || colors[3]}
        min-w-[100px] relative z-10 bg-slate-900
    `;

    return (
        <div className="flex flex-col items-center">
            <div className={cardClass}>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold mb-1">
                    {node.name.charAt(0)}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">{node.name}</span>
                <span className="text-[10px] opacity-70">${node.sales}</span>
            </div>
            
            {hasChildren && (
                <>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <div className="flex gap-4 relative">
                        {/* Connector Line Logic for multiple children */}
                        {node.children!.length > 1 && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gray-600 -translate-y-px" style={{ width: 'calc(100% - 100px)' }}></div>
                        )}
                        {node.children!.map((child) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Vertical connector to child */}
                                <div className="w-px h-6 bg-gray-600 absolute -top-6"></div>
                                <TreeNode node={child} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const ReferralTree: React.FC = () => {
    return (
        <div className="w-full overflow-x-auto p-8 bg-[#0f1525] rounded-2xl border border-white/5 flex justify-center min-h-[400px]">
            <TreeNode node={MOCK_TREE} />
        </div>
    );
};

export default ReferralTree;
