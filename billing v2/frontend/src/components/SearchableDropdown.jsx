import { useState, useRef, useEffect } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';

const SearchableDropdown = ({
    options,
    value,
    onChange,
    placeholder,
    onAddNew,
    addNewLabel = "New Category",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = value || '';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-all focus:ring-2 focus:ring-blue-100"
            >
                <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedOption || placeholder}
                </span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-3 border-b border-slate-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                autoFocus
                                type="text"
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={index}
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-all duration-200 ${selectedOption === option
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm mx-1 rounded-lg'
                                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:pl-6'
                                        }`}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center italic">
                                No results found
                            </div>
                        )}
                    </div>

                    {onAddNew && (
                        <div
                            className="p-2 border-t border-slate-50 mt-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddNew();
                                setIsOpen(false);
                            }}
                        >
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-bold">
                                <div className="p-1 bg-blue-100 rounded-full">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
